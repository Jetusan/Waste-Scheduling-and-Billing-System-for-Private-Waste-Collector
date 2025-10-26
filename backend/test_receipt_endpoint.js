const pool = require('./config/dbAdmin');

async function testReceiptEndpoint() {
  console.log('🧪 Testing Receipt Endpoint...');
  
  try {
    const userId = 286; // Ticaloan's user ID
    
    console.log(`🔍 Testing receipt endpoint for user: ${userId}`);
    
    // Simulate the getUserReceipts function
    const query = `
      SELECT 
        r.receipt_id,
        r.receipt_number,
        r.payment_id,
        r.invoice_id,
        r.user_id,
        r.subscription_id,
        r.amount,
        r.payment_method,
        r.payment_date,
        r.receipt_data,
        r.status,
        r.created_at,
        cs.plan_id,
        sp.plan_name
      FROM receipts r
      LEFT JOIN customer_subscriptions cs ON r.subscription_id = cs.subscription_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    console.log(`✅ Query executed successfully`);
    console.log(`📊 Found ${result.rows.length} receipt records`);
    
    if (result.rows.length > 0) {
      console.log('\n📄 Receipt Records:');
      result.rows.forEach((receipt, index) => {
        console.log(`  ${index + 1}. Receipt: ${receipt.receipt_number}`);
        console.log(`     Amount: ₱${receipt.amount}`);
        console.log(`     Method: ${receipt.payment_method}`);
        console.log(`     Date: ${receipt.payment_date}`);
        console.log(`     Status: ${receipt.status}`);
        console.log(`     Plan: ${receipt.plan_name || 'N/A'}`);
        console.log('');
      });
      
      // Test API response format
      const apiResponse = {
        success: true,
        receipts: result.rows.map(receipt => ({
          receipt_id: receipt.receipt_id,
          receipt_number: receipt.receipt_number,
          amount: receipt.amount,
          payment_method: receipt.payment_method,
          payment_date: receipt.payment_date,
          status: receipt.status,
          plan_name: receipt.plan_name,
          receipt_data: receipt.receipt_data ? JSON.parse(receipt.receipt_data) : null
        }))
      };
      
      console.log('\n🔗 API Response Format:');
      console.log(JSON.stringify(apiResponse, null, 2));
      
    } else {
      console.log('📝 No receipt records found for this user');
      console.log('💡 This means OCR verification is not generating receipts');
      
      // Check if user has any payments that should have receipts
      const paymentQuery = `
        SELECT 
          p.payment_id,
          p.amount,
          p.payment_method,
          p.reference_number,
          p.created_at
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        WHERE cs.user_id = $1
        ORDER BY p.created_at DESC
      `;
      
      const paymentResult = await pool.query(paymentQuery, [userId]);
      console.log(`💰 Found ${paymentResult.rows.length} payment records that should have receipts`);
      
      if (paymentResult.rows.length > 0) {
        console.log('❌ ISSUE: Payments exist but no receipts generated');
        console.log('💡 Receipt generation is failing in OCR verification');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testReceiptEndpoint();
