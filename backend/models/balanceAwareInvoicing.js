const { pool } = require('../config/db');

/**
 * Enhanced invoice generation that considers user balance
 * If user has credit balance, it reduces the invoice amount
 */

// Get user's current balance from ledger
const getUserCurrentBalance = async (userId) => {
  const query = `
    WITH ledger_entries AS (
      -- Invoice entries (debits)
      SELECT 
        i.amount as debit,
        0 as credit,
        i.generated_date as sort_date,
        'invoice' as entry_type
      FROM invoices i
      WHERE i.user_id = $1
      
      UNION ALL
      
      -- Payment entries (credits)
      SELECT 
        0 as debit,
        p.amount as credit,
        p.payment_date as sort_date,
        'payment' as entry_type
      FROM payments p
      INNER JOIN invoices i ON p.invoice_id = i.invoice_id
      WHERE i.user_id = $1
    )
    SELECT 
      COALESCE(SUM(debit - credit), 0) as current_balance,
      COALESCE(SUM(debit), 0) as total_billed,
      COALESCE(SUM(credit), 0) as total_paid
    FROM ledger_entries
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

// Create balance-aware invoice
const createBalanceAwareInvoice = async (invoiceData) => {
  const { user_id, plan_id, subscription_id, due_date, generated_date, notes, base_amount } = invoiceData;
  
  // Get user's current balance
  const balanceInfo = await getUserCurrentBalance(user_id);
  const currentBalance = parseFloat(balanceInfo.current_balance || 0);
  
  console.log(`💰 User ${user_id} Balance Analysis:`, {
    current_balance: currentBalance,
    total_billed: balanceInfo.total_billed,
    total_paid: balanceInfo.total_paid,
    base_invoice_amount: base_amount
  });
  
  // Calculate final invoice amount
  let finalAmount = base_amount;
  let creditApplied = 0;
  let balanceAfterInvoice = currentBalance + base_amount;
  
  // If user has negative balance (credit), apply it to reduce invoice
  if (currentBalance < 0) {
    creditApplied = Math.abs(currentBalance);
    
    // If credit covers entire invoice
    if (creditApplied >= base_amount) {
      finalAmount = 0;
      creditApplied = base_amount;
      balanceAfterInvoice = currentBalance + base_amount;
    } else {
      // Partial credit application
      finalAmount = base_amount - creditApplied;
      balanceAfterInvoice = 0;
    }
  }
  
  // Generate invoice number
  const invoiceNumberQuery = 'SELECT COUNT(*) + 1 as next_number FROM invoices';
  const invoiceNumberResult = await pool.query(invoiceNumberQuery);
  const invoiceNumber = `INV-${String(invoiceNumberResult.rows[0].next_number).padStart(3, '0')}`;
  
  // Enhanced notes with balance information
  let enhancedNotes = notes;
  if (creditApplied > 0) {
    enhancedNotes += ` | Credit Applied: ₱${creditApplied.toFixed(2)} | Original Amount: ₱${base_amount}`;
  }
  
  // Create invoice with adjusted amount
  const query = `
    INSERT INTO invoices (
      invoice_number, 
      user_id, 
      plan_id, 
      subscription_id, 
      due_date, 
      generated_date, 
      notes, 
      amount,
      original_amount,
      credit_applied
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    invoiceNumber,
    user_id,
    plan_id,
    subscription_id,
    due_date,
    generated_date,
    enhancedNotes,
    finalAmount,
    base_amount,
    creditApplied
  ]);
  
  const invoice = result.rows[0];
  
  console.log(`📄 Balance-Aware Invoice Created:`, {
    invoice_number: invoice.invoice_number,
    user_id: user_id,
    original_amount: base_amount,
    credit_applied: creditApplied,
    final_amount: finalAmount,
    balance_after: balanceAfterInvoice
  });
  
  return {
    invoice,
    balanceInfo: {
      previous_balance: currentBalance,
      credit_applied: creditApplied,
      final_amount: finalAmount,
      balance_after_invoice: balanceAfterInvoice
    }
  };
};

// Enhanced monthly invoice generation with balance consideration
const generateBalanceAwareMonthlyInvoices = async () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const query = `
    SELECT 
      cs.subscription_id,
      cs.user_id,
      sp.plan_name,
      sp.price,
      sp.frequency
    FROM customer_subscriptions cs
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE cs.status = 'active' 
    AND sp.frequency = 'monthly'
    AND cs.billing_start_date <= $1
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.subscription_id = cs.subscription_id 
      AND i.generated_date >= $2
      AND i.status = 'unpaid'
    )
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.subscription_id = cs.subscription_id 
      AND DATE(i.created_at) = CURRENT_DATE
    )
  `;
  
  const result = await pool.query(query, [today, firstDayOfMonth]);
  
  const newInvoices = [];
  for (const subscription of result.rows) {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days
    
    const invoiceData = {
      user_id: subscription.user_id,
      plan_id: subscription.plan_id,
      subscription_id: subscription.subscription_id,
      base_amount: subscription.price,
      due_date: dueDate.toISOString().split('T')[0],
      generated_date: today.toISOString().split('T')[0],
      notes: `Monthly invoice for ${subscription.plan_name} plan`
    };
    
    const invoiceResult = await createBalanceAwareInvoice(invoiceData);
    newInvoices.push(invoiceResult);
  }
  
  return newInvoices;
};

// Enhanced renewal with balance consideration
const renewWithBalanceConsideration = async (userId, paymentMethod, subscriptionId, planPrice, planName) => {
  const currentDate = new Date();
  const dueDate = new Date(currentDate);
  dueDate.setDate(dueDate.getDate() + 15);
  
  const invoiceData = {
    user_id: userId,
    subscription_id: subscriptionId,
    base_amount: planPrice,
    due_date: dueDate.toISOString().split('T')[0],
    generated_date: currentDate.toISOString().split('T')[0],
    notes: `Renewal invoice for ${planName} - Next billing cycle`
  };
  
  return await createBalanceAwareInvoice(invoiceData);
};

module.exports = {
  getUserCurrentBalance,
  createBalanceAwareInvoice,
  generateBalanceAwareMonthlyInvoices,
  renewWithBalanceConsideration
};
