const pool = require('./config/dbAdmin');

async function testPaymentHistory() {
  console.log('🧪 Testing Payment History Endpoint...');
  
  try {
    const userId = 286; // Ticaloan's user ID
    
    console.log(`🔍 Fetching payment history for user: ${userId}`);
    
    const query = `
      SELECT 
        p.payment_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.reference_number,
        i.invoice_id,
        i.subscription_id,
        i.status as invoice_status,
        cs.plan_id,
        sp.plan_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.invoice_id
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = $1
      ORDER BY p.payment_date DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    console.log(`✅ Query executed successfully`);
    console.log(`📊 Found ${result.rows.length} payment records`);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Payment Records:');
      result.rows.forEach((payment, index) => {
        console.log(`  ${index + 1}. Payment ID: ${payment.payment_id}`);
        console.log(`     Amount: ₱${payment.amount}`);
        console.log(`     Method: ${payment.payment_method}`);
        console.log(`     Date: ${payment.payment_date}`);
        console.log(`     Reference: ${payment.reference_number}`);
        console.log(`     Invoice Status: ${payment.invoice_status}`);
        console.log('');
      });
    } else {
      console.log('📝 No payment records found for this user');
      
      // Check if user has subscriptions
      const subQuery = `
        SELECT subscription_id, status, payment_status, payment_method
        FROM customer_subscriptions 
        WHERE user_id = $1
      `;
      const subResult = await pool.query(subQuery, [userId]);
      
      console.log(`📋 User has ${subResult.rows.length} subscriptions:`);
      subResult.rows.forEach(sub => {
        console.log(`  - Subscription ${sub.subscription_id}: ${sub.status} (${sub.payment_status})`);
      });
    }
    
    // Test the API endpoint format
    const apiResponse = {
      success: true,
      payments: result.rows
    };
    
    console.log('\n🔗 API Response Format:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testPaymentHistory();
