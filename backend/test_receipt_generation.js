const pool = require('./config/dbAdmin');

async function testReceiptGeneration() {
  console.log('🧪 Testing Receipt Generation');
  console.log('='.repeat(40));
  
  try {
    const userId = 286;
    const subscriptionId = 133;
    const gcash_reference = 'TEST-GCASH-REF';
    const expectedAmount = 199;
    
    console.log('\n📋 STEP 1: Find payment record');
    
    // Try to find the payment record (same query as in OCR code)
    const paymentQuery = `
      SELECT p.payment_id, p.invoice_id, p.amount, p.payment_method, p.payment_date, p.reference_number
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.invoice_id
      WHERE i.subscription_id = $1
      ORDER BY p.created_at DESC
      LIMIT 1
    `;
    const paymentResult = await pool.query(paymentQuery, [subscriptionId]);
    
    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];
      console.log('✅ Found payment record:');
      console.log(`   Payment ID: ${payment.payment_id}`);
      console.log(`   Invoice ID: ${payment.invoice_id}`);
      console.log(`   Amount: ₱${payment.amount}`);
      console.log(`   Method: ${payment.payment_method}`);
      console.log(`   Reference: ${payment.reference_number}`);
      
      console.log('\n📄 STEP 2: Generate receipt');
      
      const receiptNumber = `RCP-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;
      
      const receiptData = {
        payment_id: payment.payment_id,
        invoice_id: payment.invoice_id,
        amount: payment.amount,
        payment_method: 'Manual GCash (OCR Verified)',
        reference_number: gcash_reference,
        payment_date: payment.payment_date,
        subscription_id: subscriptionId,
        user_id: userId,
        ocr_verification: { status: 'verified', confidence: 0.95 }
      };
      
      console.log('Receipt data:', receiptData);
      
      const receiptQuery = `
        INSERT INTO receipts (
          receipt_number, payment_id, invoice_id, user_id, subscription_id,
          amount, payment_method, payment_date, receipt_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING receipt_id, receipt_number
      `;
      
      try {
        const receiptResult = await pool.query(receiptQuery, [
          receiptNumber,
          payment.payment_id,
          payment.invoice_id,
          userId,
          subscriptionId,
          payment.amount,
          'Manual GCash',
          payment.payment_date,
          JSON.stringify(receiptData),
          'generated'
        ]);
        
        console.log('✅ Receipt generated successfully:');
        console.log(`   Receipt ID: ${receiptResult.rows[0].receipt_id}`);
        console.log(`   Receipt Number: ${receiptResult.rows[0].receipt_number}`);
        
        // Verify receipt was created
        console.log('\n🔍 STEP 3: Verify receipt in database');
        const verifyQuery = `
          SELECT receipt_id, receipt_number, amount, payment_method, status
          FROM receipts
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `;
        
        const verifyResult = await pool.query(verifyQuery, [userId]);
        if (verifyResult.rows.length > 0) {
          const receipt = verifyResult.rows[0];
          console.log('✅ Receipt verified in database:');
          console.log(`   Receipt: ${receipt.receipt_number}`);
          console.log(`   Amount: ₱${receipt.amount}`);
          console.log(`   Status: ${receipt.status}`);
        }
        
      } catch (receiptError) {
        console.error('❌ Receipt generation failed:', receiptError);
        console.error('Error details:', receiptError.message);
        
        // Check if it's a constraint issue
        if (receiptError.code) {
          console.error('Error code:', receiptError.code);
        }
      }
      
    } else {
      console.log('❌ No payment record found');
      
      // Try fallback approach (invoice only)
      console.log('\n📄 STEP 2B: Try fallback receipt generation');
      
      const invoiceQuery = `
        SELECT invoice_id, amount
        FROM invoices
        WHERE subscription_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const invoiceResult = await pool.query(invoiceQuery, [subscriptionId]);
      
      if (invoiceResult.rows.length > 0) {
        const invoice = invoiceResult.rows[0];
        console.log(`✅ Found invoice: ${invoice.invoice_id}`);
        
        const receiptNumber = `RCP-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;
        
        const receiptData = {
          amount: expectedAmount,
          payment_method: 'Manual GCash (OCR Verified)',
          reference_number: gcash_reference,
          payment_date: new Date(),
          subscription_id: subscriptionId,
          user_id: userId,
          note: 'Receipt generated from OCR verification (fallback)'
        };
        
        const receiptQuery = `
          INSERT INTO receipts (
            receipt_number, invoice_id, user_id, subscription_id,
            amount, payment_method, payment_date, receipt_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING receipt_id, receipt_number
        `;
        
        try {
          const receiptResult = await pool.query(receiptQuery, [
            receiptNumber,
            invoice.invoice_id,
            userId,
            subscriptionId,
            expectedAmount,
            'Manual GCash',
            new Date(),
            JSON.stringify(receiptData),
            'generated'
          ]);
          
          console.log('✅ Fallback receipt generated:');
          console.log(`   Receipt: ${receiptResult.rows[0].receipt_number}`);
          
        } catch (fallbackError) {
          console.error('❌ Fallback receipt generation failed:', fallbackError);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testReceiptGeneration();
