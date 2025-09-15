const { pool } = require('./config/db');

async function debugReceipt() {
  try {
    console.log('🔍 Debugging receipt generation...');
    
    // Check payment_sources table
    console.log('\n1. Checking payment_sources table...');
    const psData = await pool.query('SELECT COUNT(*) as count FROM payment_sources');
    console.log(`Payment sources count: ${psData.rows[0].count}`);
    
    if (psData.rows[0].count > 0) {
      const sample = await pool.query('SELECT * FROM payment_sources LIMIT 1');
      console.log('Sample payment_sources data:');
      console.log(sample.rows[0]);
    }
    
    // Check payments table
    console.log('\n2. Checking payments table...');
    const paymentsData = await pool.query('SELECT COUNT(*) as count FROM payments');
    console.log(`Payments count: ${paymentsData.rows[0].count}`);
    
    if (paymentsData.rows[0].count > 0) {
      const sample = await pool.query('SELECT * FROM payments LIMIT 1');
      console.log('Sample payments data:');
      console.log(sample.rows[0]);
    }
    
    // Check invoices table
    console.log('\n3. Checking invoices table...');
    const invoicesData = await pool.query('SELECT COUNT(*) as count FROM invoices');
    console.log(`Invoices count: ${invoicesData.rows[0].count}`);
    
    // Test receipt endpoint directly
    console.log('\n4. Testing receipt generation logic...');
    
    // Get a real source_id from payment_sources table
    let testSourceId = null;
    if (psData.rows[0].count > 0) {
      const sample = await pool.query('SELECT source_id FROM payment_sources LIMIT 1');
      testSourceId = sample.rows[0].source_id;
      console.log('Testing with source_id:', testSourceId);
    }
    
    // Try to simulate the receipt controller logic
    const receiptController = require('./controller/receiptController');
    
    // Mock request and response objects
    const mockReq = {
      query: testSourceId ? { source_id: testSourceId } : { subscription_id: '1' }
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => console.log(`Status ${code}:`, data)
      }),
      send: (html) => {
        console.log('Receipt HTML generated successfully, length:', html.length);
        if (html.includes('Payment Successful')) {
          console.log('✅ Fallback success page generated');
        } else if (html.includes('Payment Receipt')) {
          console.log('✅ Full receipt generated');
        }
      }
    };
    
    console.log('Calling generateReceipt...');
    await receiptController.generateReceipt(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugReceipt();
