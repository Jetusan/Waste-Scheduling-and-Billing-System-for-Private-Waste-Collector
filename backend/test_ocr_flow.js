const pool = require('./config/dbAdmin');

async function testOCRFlow() {
  console.log('🧪 Testing Complete OCR Flow...');
  
  try {
    const userId = 286; // Ticaloan's user ID
    
    // Step 1: Check current subscription status
    console.log('\n📋 Step 1: Current Subscription Status');
    const subQuery = `
      SELECT 
        cs.subscription_id,
        cs.status,
        cs.payment_status,
        cs.payment_method,
        cs.payment_confirmed_at,
        i.invoice_id,
        i.status as invoice_status,
        i.amount
      FROM customer_subscriptions cs
      LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id
      WHERE cs.user_id = $1
      ORDER BY cs.created_at DESC
      LIMIT 1
    `;
    
    const subResult = await pool.query(subQuery, [userId]);
    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      console.log(`✅ Subscription ${sub.subscription_id}:`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Payment Status: ${sub.payment_status}`);
      console.log(`   Payment Method: ${sub.payment_method}`);
      console.log(`   Invoice Status: ${sub.invoice_status}`);
      console.log(`   Amount: ₱${sub.amount}`);
    }
    
    // Step 2: Check for payments
    console.log('\n💰 Step 2: Payment Records');
    const paymentQuery = `
      SELECT 
        p.payment_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.reference_number,
        p.created_at
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.invoice_id
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      WHERE cs.user_id = $1
      ORDER BY p.created_at DESC
    `;
    
    const paymentResult = await pool.query(paymentQuery, [userId]);
    console.log(`📊 Found ${paymentResult.rows.length} payment records`);
    
    paymentResult.rows.forEach((payment, index) => {
      console.log(`  ${index + 1}. Payment ID: ${payment.payment_id}`);
      console.log(`     Amount: ₱${payment.amount}`);
      console.log(`     Method: ${payment.payment_method}`);
      console.log(`     Reference: ${payment.reference_number}`);
      console.log(`     Date: ${payment.payment_date}`);
    });
    
    // Step 3: Check for receipts
    console.log('\n📄 Step 3: Receipt Records');
    const receiptQuery = `
      SELECT 
        receipt_id,
        receipt_number,
        payment_id,
        amount,
        payment_method,
        status,
        created_at
      FROM receipts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const receiptResult = await pool.query(receiptQuery, [userId]);
    console.log(`📊 Found ${receiptResult.rows.length} receipt records`);
    
    receiptResult.rows.forEach((receipt, index) => {
      console.log(`  ${index + 1}. Receipt: ${receipt.receipt_number}`);
      console.log(`     Payment ID: ${receipt.payment_id}`);
      console.log(`     Amount: ₱${receipt.amount}`);
      console.log(`     Method: ${receipt.payment_method}`);
      console.log(`     Status: ${receipt.status}`);
      console.log(`     Created: ${receipt.created_at}`);
    });
    
    // Step 4: Check GCash payment records
    console.log('\n📱 Step 4: GCash Payment Records');
    const gcashQuery = `
      SELECT 
        id,
        payment_reference,
        gcash_reference,
        amount,
        status,
        verified_at,
        created_at
      FROM gcash_qr_payments
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const gcashResult = await pool.query(gcashQuery, [userId]);
    console.log(`📊 Found ${gcashResult.rows.length} GCash payment records`);
    
    gcashResult.rows.forEach((gcash, index) => {
      console.log(`  ${index + 1}. GCash Payment:`);
      console.log(`     Payment Ref: ${gcash.payment_reference}`);
      console.log(`     GCash Ref: ${gcash.gcash_reference}`);
      console.log(`     Amount: ₱${gcash.amount}`);
      console.log(`     Status: ${gcash.status}`);
      console.log(`     Verified: ${gcash.verified_at}`);
    });
    
    // Step 5: Analysis
    console.log('\n🔍 Step 5: Flow Analysis');
    
    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      
      if (sub.status === 'active' && sub.payment_status === 'paid') {
        console.log('✅ Subscription is active and paid');
        
        if (paymentResult.rows.length === 0) {
          console.log('❌ ISSUE: No payment record found despite paid status');
          console.log('💡 This suggests OCR verification activated subscription without creating payment record');
        }
        
        if (receiptResult.rows.length === 0) {
          console.log('❌ ISSUE: No receipt generated despite paid status');
          console.log('💡 This is why "View Receipt" button is not working');
        }
      } else {
        console.log(`⚠️ Subscription status: ${sub.status}, payment: ${sub.payment_status}`);
      }
    }
    
    console.log('\n🎯 Recommendations:');
    console.log('1. OCR verification should create payment record');
    console.log('2. OCR verification should generate receipt');
    console.log('3. Frontend should check for receipt existence before showing "View Receipt" button');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testOCRFlow();
