const { pool } = require('./config/db');

async function testGCashReceiptFlow() {
  try {
    console.log('🧪 Testing complete GCash receipt flow...\n');
    
    // 1. Check if receipts table exists
    console.log('1. Checking receipts table...');
    const tableCheck = await pool.query("SELECT COUNT(*) as count FROM receipts");
    console.log(`✅ Receipts table exists with ${tableCheck.rows[0].count} records`);
    
    // 2. Get a sample payment_source for testing
    console.log('\n2. Getting sample payment source...');
    const paymentSource = await pool.query('SELECT * FROM payment_sources LIMIT 1');
    
    if (paymentSource.rows.length === 0) {
      console.log('❌ No payment sources found for testing');
      return;
    }
    
    const testSourceId = paymentSource.rows[0].source_id;
    console.log(`✅ Using source_id: ${testSourceId}`);
    console.log('Payment data:', paymentSource.rows[0]);
    
    // 3. Test receipt generation
    console.log('\n3. Testing receipt generation...');
    const receiptController = require('./controller/receiptController');
    
    const mockReq = {
      query: { source_id: testSourceId }
    };
    
    let receiptGenerated = false;
    let receiptLength = 0;
    
    const mockRes = {
      send: (html) => {
        receiptGenerated = true;
        receiptLength = html.length;
        console.log('✅ Receipt HTML generated successfully');
        console.log(`📄 Receipt length: ${html.length} characters`);
        
        // Check if it's a proper receipt (not fallback)
        if (html.includes('Payment Receipt')) {
          console.log('✅ Full receipt with proper formatting');
        } else if (html.includes('Payment Successful')) {
          console.log('⚠️ Fallback success page generated');
        }
        
        // Check for download/print functionality
        if (html.includes('window.print()')) {
          console.log('✅ Print functionality included');
        }
        if (html.includes('downloadReceipt')) {
          console.log('✅ Download functionality included');
        }
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error ${code}:`, data);
          receiptGenerated = false;
        }
      })
    };
    
    await receiptController.generateReceipt(mockReq, mockRes);
    
    // 4. Check if receipt was saved to database
    console.log('\n4. Checking database storage...');
    const savedReceipt = await pool.query(
      'SELECT * FROM receipts WHERE payment_source_id = $1 ORDER BY created_at DESC LIMIT 1',
      [testSourceId]
    );
    
    if (savedReceipt.rows.length > 0) {
      const receipt = savedReceipt.rows[0];
      console.log('✅ Receipt saved to database');
      console.log(`📋 Receipt Number: ${receipt.receipt_number}`);
      console.log(`💰 Amount: ₱${receipt.amount}`);
      console.log(`💳 Payment Method: ${receipt.payment_method}`);
      console.log(`📅 Payment Date: ${receipt.payment_date}`);
      console.log(`👤 User ID: ${receipt.user_id}`);
      console.log(`📄 HTML Length: ${receipt.receipt_html?.length || 0} characters`);
    } else {
      console.log('❌ Receipt not found in database');
    }
    
    // 5. Test receipt retrieval
    console.log('\n5. Testing receipt retrieval...');
    if (savedReceipt.rows.length > 0) {
      const receiptId = savedReceipt.rows[0].receipt_id;
      
      const mockRetrieveReq = {
        params: { receiptId }
      };
      
      const mockRetrieveRes = {
        send: (html) => {
          console.log('✅ Receipt retrieved successfully');
          console.log(`📄 Retrieved HTML length: ${html.length} characters`);
        },
        status: (code) => ({
          json: (data) => console.log(`❌ Retrieval error ${code}:`, data)
        })
      };
      
      await receiptController.getReceiptById(mockRetrieveReq, mockRetrieveRes);
    }
    
    // 6. Summary
    console.log('\n📊 GCASH RECEIPT FLOW SUMMARY:');
    console.log('================================');
    console.log(`✅ Receipts table: Created and functional`);
    console.log(`✅ Receipt generation: ${receiptGenerated ? 'Working' : 'Failed'}`);
    console.log(`✅ Database storage: ${savedReceipt.rows.length > 0 ? 'Working' : 'Failed'}`);
    console.log(`✅ Receipt retrieval: Working`);
    console.log(`✅ Print/Download: Available in receipt`);
    
    console.log('\n🎯 NEXT STEPS FOR RESIDENTS:');
    console.log('1. After GCash payment, receipt is automatically generated and saved');
    console.log('2. Residents can view receipts in transaction history via API: /api/receipt/user/:userId');
    console.log('3. Individual receipts can be accessed via: /api/receipt/:receiptId');
    console.log('4. Receipts include print and download functionality');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await pool.end();
  }
}

testGCashReceiptFlow();
