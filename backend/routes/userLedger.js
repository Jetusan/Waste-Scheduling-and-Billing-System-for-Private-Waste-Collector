const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/billing/users-with-history
// Returns all users who have billing history (invoices or payments)
router.get('/users-with-history', async (req, res) => {
  try {
    console.log('🔍 Fetching users with billing history...');

    const query = `
      WITH invoice_stats AS (
        SELECT 
          user_id,
          COUNT(*) AS total_invoices,
          COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) AS outstanding_balance
        FROM invoices
        GROUP BY user_id
      ),
      payment_stats AS (
        SELECT 
          i.user_id,
          COUNT(p.payment_id) AS total_payments,
          MAX(p.payment_date) AS last_payment_date
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        GROUP BY i.user_id
      )
      SELECT
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown User') AS full_name,
        u.email,
        b.barangay_name,
        cs.status AS account_status,
        COALESCE(inv.total_invoices, 0) AS total_invoices,
        COALESCE(inv.outstanding_balance, 0) AS outstanding_balance,
        pay.last_payment_date
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      LEFT JOIN invoice_stats inv ON inv.user_id = u.user_id
      LEFT JOIN payment_stats pay ON pay.user_id = u.user_id
      WHERE u.role_id = 3
        AND u.approval_status = 'approved'
        AND (COALESCE(inv.total_invoices, 0) > 0 OR COALESCE(pay.total_payments, 0) > 0)
      ORDER BY u.user_id
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} users with billing history`);
    res.json(result.rows);

  } catch (error) {
    console.error('❌ Error fetching users with billing history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users with billing history',
      details: error.message 
    });
  }
});

// GET /api/billing/user-ledger/:userId
// Returns detailed ledger for a specific user
router.get('/user-ledger/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 Fetching ledger for user ${userId}...`);

    const query = `
      WITH ledger_entries AS (
        -- Invoice entries (debits)
        SELECT 
          i.created_at as date,
          CASE 
            WHEN i.description LIKE '%Special%' THEN 'Special Pickup - ' || COALESCE(i.description, 'Service')
            WHEN i.description LIKE '%Late%' THEN 'Late Payment Fee'
            WHEN i.description LIKE '%subscription%' THEN 
              TO_CHAR(i.created_at, 'Month YYYY') || ' Subscription'
            ELSE COALESCE(i.description, 'Subscription Fee')
          END as description,
          i.invoice_number as reference,
          i.amount as debit,
          0 as credit,
          'invoice' as entry_type,
          i.created_at as sort_date
        FROM invoices i
        WHERE i.user_id = $1
        
        UNION ALL
        
        -- Payment entries (credits)
        SELECT 
          p.payment_date as date,
          'Payment Received - ' || p.payment_method as description,
          COALESCE(p.reference_number, 'PAY-' || p.payment_id) as reference,
          0 as debit,
          p.amount as credit,
          'payment' as entry_type,
          p.payment_date as sort_date
        FROM payments p
        INNER JOIN invoices i ON p.invoice_id = i.invoice_id
        WHERE i.user_id = $1
      ),
      ledger_with_balance AS (
        SELECT *,
          SUM(debit - credit) OVER (ORDER BY sort_date, entry_type DESC) as balance
        FROM ledger_entries
        ORDER BY sort_date, entry_type DESC
      )
      SELECT 
        date,
        description,
        reference,
        CASE WHEN debit > 0 THEN debit ELSE NULL END as debit,
        CASE WHEN credit > 0 THEN credit ELSE NULL END as credit,
        balance
      FROM ledger_with_balance
      ORDER BY sort_date, entry_type DESC
    `;

    const result = await pool.query(query, [userId]);
    
    console.log(`✅ Found ${result.rows.length} ledger entries for user ${userId}`);
    res.json(result.rows);

  } catch (error) {
    console.error(`❌ Error fetching ledger for user ${userId}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch user ledger',
      details: error.message 
    });
  }
});

// POST /api/billing/manual-payment
// Record a manual payment entry
router.post('/manual-payment', async (req, res) => {
  try {
    const { user_id, amount, payment_method, payment_date, reference_number, notes, invoice_id } = req.body;

    console.log('💰 Recording manual payment:', { user_id, amount, payment_method, invoice_id });

    // Validate required fields
    if (!user_id || !amount || !payment_method || !payment_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, amount, payment_method, payment_date' 
      });
    }

    // Determine target invoice
    let targetInvoiceId = invoice_id;
    if (!targetInvoiceId) {
      const invoiceResult = await pool.query(
        `SELECT invoice_id, amount FROM invoices
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [user_id]
      );

      if (invoiceResult.rows.length === 0) {
        return res.status(400).json({
          error: 'No invoice found for user. Please create an invoice before recording a payment.'
        });
      }

      targetInvoiceId = invoiceResult.rows[0].invoice_id;
    }

    // Insert payment record linked to the invoice
    const insertQuery = `
      INSERT INTO payments (
        invoice_id, amount, payment_method, payment_date,
        reference_number, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      targetInvoiceId,
      parseFloat(amount),
      payment_method,
      payment_date,
      reference_number || `PAY-${Date.now()}`,
      notes || 'Manual payment entry'
    ]);

    // Update invoice payment status based on total payments
    await pool.query(
      `UPDATE invoices SET status = CASE
         WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) >= invoices.amount THEN 'paid'
         WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) > 0 THEN 'partially_paid'
         ELSE status
       END,
       updated_at = CURRENT_TIMESTAMP
       WHERE invoice_id = $1`,
      [targetInvoiceId]
    );

    console.log('✅ Payment recorded successfully:', result.rows[0]);
    res.json({ 
      success: true, 
      payment: result.rows[0],
      message: 'Payment recorded successfully',
      invoice_id: targetInvoiceId
    });

  } catch (error) {
    console.error('❌ Error recording manual payment:', error);
    res.status(500).json({ 
      error: 'Failed to record payment',
      details: error.message 
    });
  }
});

// GET /api/billing/user-summary/:userId
// Get summary statistics for a user
router.get('/user-summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 Fetching summary for user ${userId}...`);

    const query = `
      WITH invoice_stats AS (
        SELECT 
          user_id,
          COUNT(*) AS total_invoices,
          COALESCE(SUM(amount), 0) AS total_billed,
          COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) AS outstanding_balance,
          MIN(created_at) AS first_invoice_date
        FROM invoices
        GROUP BY user_id
      ),
      payment_stats AS (
        SELECT 
          i.user_id,
          COALESCE(SUM(p.amount), 0) AS total_paid,
          COUNT(p.payment_id) AS total_payments,
          MAX(p.payment_date) AS last_payment_date
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        GROUP BY i.user_id
      )
      SELECT 
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown User') as full_name,
        COALESCE(inv.total_invoices, 0) as total_invoices,
        COALESCE(inv.total_billed, 0) as total_billed,
        COALESCE(pay.total_paid, 0) as total_paid,
        COALESCE(inv.outstanding_balance, 0) as outstanding_balance,
        COALESCE(pay.total_payments, 0) as total_payments,
        pay.last_payment_date,
        inv.first_invoice_date
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN invoice_stats inv ON inv.user_id = u.user_id
      LEFT JOIN payment_stats pay ON pay.user_id = u.user_id
      WHERE u.user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Summary for user ${userId}:`, result.rows[0]);
    res.json(result.rows[0]);

  } catch (error) {
    console.error(`❌ Error fetching summary for user ${userId}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch user summary',
      details: error.message 
    });
  }
});

module.exports = router;
