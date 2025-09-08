const { pool } = require('../config/db');
const billingController = require('../controller/billingController');

const testPaymentUpdate = async () => {
  try {
    console.log('🧪 Testing payment status update...');
    
    // Get the most recent payment source
    const result = await pool.query(
      'SELECT * FROM payment_sources WHERE status = $1 ORDER BY created_at DESC LIMIT 1',
      ['pending']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No pending payment sources found to test');
      return;
    }
    
    const paymentSource = result.rows[0];
    console.log('📋 Testing with payment source:', paymentSource.source_id);
    console.log('💰 Amount:', paymentSource.amount / 100, 'PHP');
    console.log('📄 Invoice ID:', paymentSource.invoice_id);
    
    // Test updating the payment status to completed
    console.log('\n🔄 Updating payment status to completed...');
    await billingController.updatePaymentStatus(paymentSource.source_id, 'completed');
    
    console.log('✅ Payment status update completed!');
    console.log('\n🔍 Checking results...');
    
    // Check payment_sources table
    const updatedSource = await pool.query(
      'SELECT * FROM payment_sources WHERE source_id = $1',
      [paymentSource.source_id]
    );
    console.log('📊 Payment Source Status:', updatedSource.rows[0].status);
    
    // Check if invoice was updated
    if (paymentSource.invoice_id) {
      const invoice = await pool.query(
        'SELECT * FROM invoices WHERE invoice_id = $1',
        [paymentSource.invoice_id]
      );
      console.log('📄 Invoice Status:', invoice.rows[0].status);
      
      // Check if subscription was activated
      const subscription = await pool.query(
        'SELECT * FROM customer_subscriptions WHERE subscription_id = (SELECT subscription_id FROM invoices WHERE invoice_id = $1)',
        [paymentSource.invoice_id]
      );
      if (subscription.rows.length > 0) {
        console.log('🔄 Subscription Status:', subscription.rows[0].status);
        console.log('💳 Payment Status:', subscription.rows[0].payment_status);
        console.log('✅ Payment Confirmed At:', subscription.rows[0].payment_confirmed_at);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
};

testPaymentUpdate();
