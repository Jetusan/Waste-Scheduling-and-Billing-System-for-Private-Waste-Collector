const { pool } = require('../config/db');
const billingController = require('../controller/billingController');

const testSubscriptionActivation = async () => {
  try {
    console.log('🧪 Testing subscription activation for invoice 74...');
    
    // Get payment source for invoice 74 (subscription 22)
    const paymentSource = await pool.query(
      'SELECT * FROM payment_sources WHERE invoice_id = $1 AND status = $2 LIMIT 1',
      [74, 'pending']
    );
    
    if (paymentSource.rows.length === 0) {
      console.log('❌ No pending payment source found for invoice 74');
      return;
    }
    
    const sourceId = paymentSource.rows[0].source_id;
    console.log('📋 Testing with payment source:', sourceId);
    console.log('📄 Invoice ID: 74, Subscription ID: 22');
    
    // Check current status
    console.log('\n📊 BEFORE Payment Update:');
    const beforeSub = await pool.query('SELECT * FROM customer_subscriptions WHERE subscription_id = $1', [22]);
    const beforeInv = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [74]);
    console.log('🔄 Subscription Status:', beforeSub.rows[0].status, '| Payment Status:', beforeSub.rows[0].payment_status);
    console.log('📄 Invoice Status:', beforeInv.rows[0].status);
    
    // Update payment status to completed
    console.log('\n🔄 Updating payment status to completed...');
    await billingController.updatePaymentStatus(sourceId, 'completed');
    
    // Check results
    console.log('\n📊 AFTER Payment Update:');
    const afterSub = await pool.query('SELECT * FROM customer_subscriptions WHERE subscription_id = $1', [22]);
    const afterInv = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [74]);
    const paymentRecord = await pool.query('SELECT * FROM payments WHERE invoice_id = $1', [74]);
    
    console.log('🔄 Subscription Status:', afterSub.rows[0].status, '| Payment Status:', afterSub.rows[0].payment_status);
    console.log('✅ Payment Confirmed At:', afterSub.rows[0].payment_confirmed_at);
    console.log('📄 Invoice Status:', afterInv.rows[0].status);
    console.log('💰 Payment Records:', paymentRecord.rows.length > 0 ? 'Created' : 'None');
    
    if (afterSub.rows[0].status === 'active' && afterSub.rows[0].payment_status === 'paid') {
      console.log('\n🎉 SUCCESS! Subscription properly activated!');
    } else {
      console.log('\n❌ FAILED! Subscription not activated properly.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
};

testSubscriptionActivation();
