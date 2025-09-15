const { pool } = require('./config/db');

async function analyzeGCashReceiptData() {
  try {
    console.log('🔍 Analyzing GCash payment flow and receipt data requirements...\n');
    
    // 1. Check payment_sources table structure and data
    console.log('1. PAYMENT_SOURCES TABLE:');
    const psSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'payment_sources'
      ORDER BY ordinal_position
    `);
    console.table(psSchema.rows);
    
    const psSample = await pool.query('SELECT * FROM payment_sources LIMIT 3');
    console.log('Sample payment_sources data:');
    console.table(psSample.rows);
    
    // 2. Check what data is linked to payment_sources
    console.log('\n2. LINKED DATA ANALYSIS:');
    const linkedData = await pool.query(`
      SELECT 
        ps.source_id,
        ps.amount,
        ps.payment_method,
        ps.status,
        ps.invoice_id,
        ps.created_at,
        i.invoice_number,
        i.subscription_id as invoice_subscription_id,
        cs.resident_id,
        cs.plan_id,
        sp.plan_name,
        sp.price,
        r.address,
        u.username,
        u.contact_number,
        un.first_name,
        un.last_name
      FROM payment_sources ps
      LEFT JOIN invoices i ON ps.invoice_id = i.invoice_id
      LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      LEFT JOIN residents r ON cs.resident_id = r.resident_id
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LIMIT 3
    `);
    
    console.log('Linked data for receipts:');
    console.table(linkedData.rows);
    
    // 3. Check what's missing in current receipt data
    console.log('\n3. DATA COMPLETENESS CHECK:');
    linkedData.rows.forEach((row, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log('✅ Has payment data:', !!row.source_id);
      console.log('✅ Has invoice:', !!row.invoice_number);
      console.log('✅ Has customer name:', !!(row.first_name || row.username));
      console.log('✅ Has plan info:', !!row.plan_name);
      console.log('✅ Has address:', !!row.address);
      console.log('❌ Missing data:', {
        customer_name: !(row.first_name || row.username),
        invoice: !row.invoice_number,
        plan: !row.plan_name,
        address: !row.address
      });
    });
    
    // 4. Test current receipt generation
    console.log('\n4. TESTING CURRENT RECEIPT GENERATION:');
    if (psSample.rows.length > 0) {
      const testSourceId = psSample.rows[0].source_id;
      console.log(`Testing receipt generation for source_id: ${testSourceId}`);
      
      const receiptController = require('./controller/receiptController');
      
      const mockReq = { query: { source_id: testSourceId } };
      const mockRes = {
        send: (html) => {
          console.log('✅ Receipt generated successfully');
          console.log('Receipt type:', html.includes('Payment Receipt') ? 'Full Receipt' : 'Fallback Page');
          console.log('Receipt length:', html.length);
          
          // Check if receipt contains proper customer data
          if (html.includes('Customer') && !html.includes('customer@email.com')) {
            console.log('✅ Contains real customer data');
          } else {
            console.log('⚠️ Using fallback customer data');
          }
        },
        status: (code) => ({ json: (data) => console.log(`Error ${code}:`, data) })
      };
      
      await receiptController.generateReceipt(mockReq, mockRes);
    }
    
    // 5. Recommend optimal table structure for receipts
    console.log('\n5. RECOMMENDED TABLES FOR RECEIPT GENERATION:');
    console.log(`
📋 ESSENTIAL TABLES FOR GCASH RECEIPTS:
1. payment_sources - Payment transaction details
2. invoices - Invoice information and billing details  
3. customer_subscriptions - Subscription and service details
4. subscription_plans - Plan name, price, frequency
5. residents - Customer address and location
6. users - Customer contact information
7. user_names - Customer full name details

🔧 OPTIMAL RECEIPT QUERY STRUCTURE:
- Primary: payment_sources (transaction data)
- Secondary: invoices (billing reference)
- Customer: residents → users → user_names (customer info)
- Service: customer_subscriptions → subscription_plans (service details)
    `);
    
  } catch (error) {
    console.error('❌ Error analyzing receipt data:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeGCashReceiptData();
