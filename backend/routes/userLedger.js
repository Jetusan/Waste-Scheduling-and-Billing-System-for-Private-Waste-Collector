const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/billing/users-with-history
// Returns all users who have billing history (invoices or payments)
router.get('/users-with-history', async (req, res) => {
  try {
    console.log('🔍 Fetching users with billing history...');

    const query = `
      SELECT DISTINCT
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown User') as full_name,
        u.email,
        b.barangay_name,
        cs.status as account_status,
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'unpaid' THEN i.amount ELSE 0 END), 0) as outstanding_balance,
        MAX(p.payment_date) as last_payment_date
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      LEFT JOIN invoices i ON u.user_id = i.user_id
      LEFT JOIN payments p ON u.user_id = p.user_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND (i.invoice_id IS NOT NULL OR p.payment_id IS NOT NULL)
      GROUP BY u.user_id, un.first_name, un.last_name, u.email, b.barangay_name, cs.status
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
        WHERE p.user_id = $1
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
    const { user_id, amount, payment_method, payment_date, reference_number, notes } = req.body;
    
    console.log('💰 Recording manual payment:', { user_id, amount, payment_method });

    // Validate required fields
    if (!user_id || !amount || !payment_method || !payment_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, amount, payment_method, payment_date' 
      });
    }

    // Insert payment record
    const insertQuery = `
      INSERT INTO payments (
        user_id, amount, payment_method, payment_date, 
        reference_number, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      user_id,
      parseFloat(amount),
      payment_method,
      payment_date,
      reference_number || `PAY-${Date.now()}`,
      notes || 'Manual payment entry'
    ]);

    console.log('✅ Payment recorded successfully:', result.rows[0]);
    res.json({ 
      success: true, 
      payment: result.rows[0],
      message: 'Payment recorded successfully' 
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
      SELECT 
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown User') as full_name,
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_billed,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COALESCE(SUM(CASE WHEN i.status = 'unpaid' THEN i.amount ELSE 0 END), 0) as outstanding_balance,
        COUNT(DISTINCT p.payment_id) as total_payments,
        MAX(p.payment_date) as last_payment_date,
        MIN(i.created_at) as first_invoice_date
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN invoices i ON u.user_id = i.user_id
      LEFT JOIN payments p ON u.user_id = p.user_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, un.first_name, un.last_name
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
