const pool = require('./config/dbAdmin');

async function debugReceiptFlow() {
  console.log('🔍 DEBUGGING RECEIPT FLOW - Step by Step Analysis');
  console.log('='.repeat(60));
  
  try {
    const userId = 286; // Ticaloan's user ID
    
    // Step 1: Check current subscription status
    console.log('\n📋 STEP 1: Current Subscription Status');
    const subQuery = `
      SELECT 
        cs.subscription_id,
        cs.status,
        cs.payment_status,
        cs.payment_method,
        cs.payment_confirmed_at,
        cs.created_at,
        cs.updated_at
      FROM customer_subscriptions cs
      WHERE cs.user_id = $1
      ORDER BY cs.created_at DESC
      LIMIT 1
    `;
    
    const subResult = await pool.query(subQuery, [userId]);
    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      console.log(`✅ Found subscription ${sub.subscription_id}:`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Payment Status: ${sub.payment_status}`);
      console.log(`   Payment Method: ${sub.payment_method}`);
      console.log(`   Confirmed At: ${sub.payment_confirmed_at}`);
      console.log(`   Updated: ${sub.updated_at}`);
      
      // Step 2: Check invoices for this subscription
      console.log('\n💰 STEP 2: Invoice Status');
      const invoiceQuery = `
        SELECT 
          invoice_id,
          subscription_id,
          amount,
          status,
          due_date,
          created_at,
          updated_at
        FROM invoices
        WHERE subscription_id = $1
        ORDER BY created_at DESC
      `;
      
      const invoiceResult = await pool.query(invoiceQuery, [sub.subscription_id]);
      console.log(`📊 Found ${invoiceResult.rows.length} invoices:`);
      
      invoiceResult.rows.forEach((invoice, index) => {
        console.log(`  ${index + 1}. Invoice ${invoice.invoice_id}:`);
        console.log(`     Amount: ₱${invoice.amount}`);
        console.log(`     Status: ${invoice.status}`);
        console.log(`     Due Date: ${invoice.due_date}`);
        console.log(`     Updated: ${invoice.updated_at}`);
      });
      
      // Step 3: Check payments
      console.log('\n💳 STEP 3: Payment Records');
      const paymentQuery = `
        SELECT 
          p.payment_id,
          p.invoice_id,
          p.amount,
          p.payment_method,
          p.payment_date,
          p.reference_number,
          p.notes,
          p.created_at
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        WHERE i.subscription_id = $1
        ORDER BY p.created_at DESC
      `;
      
      const paymentResult = await pool.query(paymentQuery, [sub.subscription_id]);
      console.log(`📊 Found ${paymentResult.rows.length} payments:`);
      
      paymentResult.rows.forEach((payment, index) => {
        console.log(`  ${index + 1}. Payment ${payment.payment_id}:`);
        console.log(`     Amount: ₱${payment.amount}`);
        console.log(`     Method: ${payment.payment_method}`);
        console.log(`     Reference: ${payment.reference_number}`);
        console.log(`     Date: ${payment.payment_date}`);
        console.log(`     Notes: ${payment.notes}`);
      });
      
      // Step 4: Check receipts
      console.log('\n📄 STEP 4: Receipt Records');
      const receiptQuery = `
        SELECT 
          receipt_id,
          receipt_number,
          payment_id,
          invoice_id,
          user_id,
          subscription_id,
          amount,
          payment_method,
          payment_date,
          status,
          created_at,
          receipt_data
        FROM receipts
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const receiptResult = await pool.query(receiptQuery, [userId]);
      console.log(`📊 Found ${receiptResult.rows.length} receipts:`);
      
      receiptResult.rows.forEach((receipt, index) => {
        console.log(`  ${index + 1}. Receipt ${receipt.receipt_number}:`);
        console.log(`     Receipt ID: ${receipt.receipt_id}`);
        console.log(`     Payment ID: ${receipt.payment_id}`);
        console.log(`     Amount: ₱${receipt.amount}`);
        console.log(`     Method: ${receipt.payment_method}`);
        console.log(`     Status: ${receipt.status}`);
        console.log(`     Created: ${receipt.created_at}`);
        
        if (receipt.receipt_data) {
          try {
            const data = JSON.parse(receipt.receipt_data);
            console.log(`     Data: ${JSON.stringify(data, null, 6)}`);
          } catch (e) {
            console.log(`     Data: ${receipt.receipt_data}`);
          }
        }
      });
      
      // Step 5: Check GCash payment records
      console.log('\n📱 STEP 5: GCash Payment Records');
      const gcashQuery = `
        SELECT 
          id,
          user_id,
          payment_reference,
          gcash_reference,
          amount,
          status,
          verified_at,
          created_at,
          receipt_image
        FROM gcash_qr_payments
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const gcashResult = await pool.query(gcashQuery, [userId]);
      console.log(`📊 Found ${gcashResult.rows.length} GCash records:`);
      
      gcashResult.rows.forEach((gcash, index) => {
        console.log(`  ${index + 1}. GCash Payment ${gcash.id}:`);
        console.log(`     Payment Ref: ${gcash.payment_reference}`);
        console.log(`     GCash Ref: ${gcash.gcash_reference}`);
        console.log(`     Amount: ₱${gcash.amount}`);
        console.log(`     Status: ${gcash.status}`);
        console.log(`     Verified: ${gcash.verified_at}`);
        console.log(`     Has Image: ${gcash.receipt_image ? 'Yes' : 'No'}`);
      });
      
    } else {
      console.log('❌ No subscription found for this user');
    }
    
    // Step 6: Analysis and Recommendations
    console.log('\n🔍 STEP 6: ANALYSIS & RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      
      if (sub.status === 'pending_payment') {
        console.log('❌ ISSUE: Subscription is still pending payment');
        console.log('💡 OCR verification has not been triggered yet');
        console.log('🔧 ACTION: Upload GCash receipt to trigger OCR verification');
      } else if (sub.status === 'active') {
        console.log('✅ Subscription is active');
        
        // Check if payments exist
        const paymentCheck = await pool.query(`
          SELECT COUNT(*) as count FROM payments p
          JOIN invoices i ON p.invoice_id = i.invoice_id
          WHERE i.subscription_id = $1
        `, [sub.subscription_id]);
        
        const receiptCheck = await pool.query(`
          SELECT COUNT(*) as count FROM receipts
          WHERE user_id = $1
        `, [userId]);
        
        if (paymentCheck.rows[0].count == 0) {
          console.log('❌ ISSUE: Subscription active but no payment records');
          console.log('💡 activateSubscription() may not be creating payment records');
          console.log('🔧 ACTION: Check billingModel.activateSubscription function');
        }
        
        if (receiptCheck.rows[0].count == 0) {
          console.log('❌ ISSUE: No receipts generated');
          console.log('💡 Receipt generation is failing in OCR verification');
          console.log('🔧 ACTION: Check receipt generation code in uploadGCashReceipt');
        }
      }
    }
    
    console.log('\n🎯 NEXT STEPS TO FIX:');
    console.log('1. Check server logs during OCR verification');
    console.log('2. Ensure activateSubscription creates payment records');
    console.log('3. Ensure receipt generation code executes without errors');
    console.log('4. Test the complete flow with logging enabled');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugReceiptFlow();
