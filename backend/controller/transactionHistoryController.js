const { pool } = require('../config/db');

// Get transaction history for a specific user
const getUserTransactionHistory = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.user_id || req.params.user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const query = `
      SELECT 
        p.payment_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.reference_number,
        p.notes,
        i.invoice_number,
        i.due_date,
        i.status as invoice_status,
        sp.plan_name,
        cs.subscription_id,
        'payment' as transaction_type
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.invoice_id
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = $1
      
      UNION ALL
      
      SELECT 
        ps.payment_source_id as payment_id,
        ps.amount,
        ps.payment_method,
        ps.created_at as payment_date,
        ps.source_id as reference_number,
        'GCash payment via PayMongo' as notes,
        i.invoice_number,
        i.due_date,
        i.status as invoice_status,
        sp.plan_name,
        cs.subscription_id,
        'gcash_payment' as transaction_type
      FROM payment_sources ps
      JOIN invoices i ON ps.invoice_id = i.invoice_id
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = $1 AND ps.status = 'completed'
      
      ORDER BY payment_date DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [userId]);
    
    const transactions = result.rows.map(row => ({
      id: row.payment_id,
      amount: parseFloat(row.amount),
      paymentMethod: row.payment_method,
      paymentDate: row.payment_date,
      referenceNumber: row.reference_number,
      notes: row.notes,
      invoice: {
        number: row.invoice_number,
        dueDate: row.due_date,
        status: row.invoice_status
      },
      plan: row.plan_name,
      subscriptionId: row.subscription_id,
      type: row.transaction_type,
      status: 'completed'
    }));

    res.json({
      success: true,
      transactions,
      total: transactions.length
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction history',
      details: error.message 
    });
  }
};

// Get transaction summary/stats for user
const getUserTransactionSummary = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.user_id || req.params.user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const summaryQuery = `
      WITH user_payments AS (
        SELECT 
          p.amount,
          p.payment_date,
          p.payment_method
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        WHERE cs.user_id = $1
        
        UNION ALL
        
        SELECT 
          ps.amount,
          ps.created_at as payment_date,
          ps.payment_method
        FROM payment_sources ps
        JOIN invoices i ON ps.invoice_id = i.invoice_id
        JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        WHERE cs.user_id = $1 AND ps.status = 'completed'
      )
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount_paid,
        COUNT(CASE WHEN payment_method = 'GCash' THEN 1 END) as gcash_payments,
        COUNT(CASE WHEN payment_method = 'Cash' THEN 1 END) as cash_payments,
        MAX(payment_date) as last_payment_date,
        MIN(payment_date) as first_payment_date
      FROM user_payments
    `;

    const result = await pool.query(summaryQuery, [userId]);
    const summary = result.rows[0];

    res.json({
      success: true,
      summary: {
        totalTransactions: parseInt(summary.total_transactions) || 0,
        totalAmountPaid: parseFloat(summary.total_amount_paid) || 0,
        gcashPayments: parseInt(summary.gcash_payments) || 0,
        cashPayments: parseInt(summary.cash_payments) || 0,
        lastPaymentDate: summary.last_payment_date,
        firstPaymentDate: summary.first_payment_date
      }
    });

  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction summary',
      details: error.message 
    });
  }
};

module.exports = {
  getUserTransactionHistory,
  getUserTransactionSummary
};
