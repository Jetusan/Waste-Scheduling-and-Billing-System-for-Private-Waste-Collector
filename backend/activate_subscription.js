const { pool } = require('./config/db');

(async () => {
  try {
    console.log('🔄 Manually activating subscription for user 146...');
    
    // Activate subscription
    const updateResult = await pool.query(
      `UPDATE customer_subscriptions 
       SET status = 'active', 
           payment_status = 'paid',
           payment_confirmed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE subscription_id = 24
       RETURNING *`
    );
    console.log('📦 Subscription activated:', updateResult.rows[0]);
    
    // Update invoice to paid
    const invoiceResult = await pool.query(
      `UPDATE invoices 
       SET status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE invoice_id = 76
       RETURNING *`
    );
    console.log('🧾 Invoice marked as paid:', invoiceResult.rows[0]);
    
    console.log('✅ Manual activation complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
