const { pool } = require('./config/db');

async function checkUserSubscription() {
  try {
    console.log('🔍 Checking subscriptions for user ID 140...');
    
    // Check customer_subscriptions table
    const subscriptionQuery = `
      SELECT 
        cs.*,
        sp.plan_name,
        sp.price
      FROM customer_subscriptions cs
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = 140
      ORDER BY cs.created_at DESC
    `;
    
    const subscriptionResult = await pool.query(subscriptionQuery);
    console.log('\n📋 Customer Subscriptions for user 140:');
    console.log(JSON.stringify(subscriptionResult.rows, null, 2));
    
    // Check invoices table
    const invoiceQuery = `
      SELECT * FROM invoices 
      WHERE user_id = 140
      ORDER BY created_at DESC
    `;
    
    const invoiceResult = await pool.query(invoiceQuery);
    console.log('\n🧾 Invoices for user 140:');
    console.log(JSON.stringify(invoiceResult.rows, null, 2));
    
    // Check payments table
    const paymentQuery = `
      SELECT * FROM payments 
      WHERE user_id = 140
      ORDER BY created_at DESC
    `;
    
    const paymentResult = await pool.query(paymentQuery);
    console.log('\n💳 Payments for user 140:');
    console.log(JSON.stringify(paymentResult.rows, null, 2));
    
    pool.end();
  } catch (error) {
    console.error('❌ Error checking user subscription:', error);
    pool.end();
  }
}

checkUserSubscription();
