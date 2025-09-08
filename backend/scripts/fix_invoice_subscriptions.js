const { pool } = require('../config/db');

const fixInvoiceSubscriptions = async () => {
  try {
    console.log('🔧 Fixing invoice-subscription links...');
    
    // Update invoices to link them with their corresponding subscriptions
    const updateQuery = `
      UPDATE invoices 
      SET subscription_id = cs.subscription_id
      FROM customer_subscriptions cs
      WHERE invoices.user_id = cs.user_id 
      AND invoices.plan_id = cs.plan_id
      AND invoices.subscription_id IS NULL
      RETURNING invoices.invoice_id, invoices.invoice_number, invoices.subscription_id
    `;
    
    const result = await pool.query(updateQuery);
    
    console.log(`✅ Updated ${result.rows.length} invoices with subscription links:`);
    result.rows.forEach(invoice => {
      console.log(`📄 Invoice ${invoice.invoice_number} (ID: ${invoice.invoice_id}) → Subscription ${invoice.subscription_id}`);
    });
    
    // Verify the updates
    console.log('\n🔍 Verifying invoice-subscription links...');
    const verifyQuery = `
      SELECT 
        i.invoice_id,
        i.invoice_number,
        i.user_id,
        i.subscription_id,
        cs.subscription_id as actual_subscription_id,
        cs.status as subscription_status
      FROM invoices i
      LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      ORDER BY i.invoice_id DESC
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.table(verifyResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
};

fixInvoiceSubscriptions();
