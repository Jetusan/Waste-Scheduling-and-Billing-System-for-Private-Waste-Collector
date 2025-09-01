const { pool } = require('../config/db');

async function fixInvoiceAmounts() {
  try {
    console.log('🔧 Fixing invoice amounts...');
    
    // Update invoices with 0.00 amount to use plan prices
    const updateQuery = `
      UPDATE invoices 
      SET amount = sp.price 
      FROM subscription_plans sp 
      WHERE invoices.plan_id = sp.plan_id 
      AND invoices.amount = 0.00
    `;
    
    const result = await pool.query(updateQuery);
    console.log(`✅ Updated ${result.rowCount} invoices with correct amounts`);
    
    // Show updated invoices
    const checkQuery = `
      SELECT 
        i.invoice_id,
        i.invoice_number,
        i.user_id,
        i.amount,
        sp.plan_name,
        sp.price as plan_price
      FROM invoices i
      JOIN subscription_plans sp ON i.plan_id = sp.plan_id
      ORDER BY i.created_at DESC
      LIMIT 5
    `;
    
    const updated = await pool.query(checkQuery);
    console.log('\n📋 Updated invoices:');
    console.table(updated.rows.map(inv => ({
      ID: inv.invoice_id,
      Number: inv.invoice_number,
      User: inv.user_id,
      Amount: `₱${inv.amount}`,
      Plan: inv.plan_name,
      PlanPrice: `₱${inv.plan_price}`
    })));
    
  } catch (error) {
    console.error('❌ Error fixing invoice amounts:', error);
  } finally {
    pool.end();
  }
}

fixInvoiceAmounts();
