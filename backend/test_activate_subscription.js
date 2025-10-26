const pool = require('./config/dbAdmin');
const billingModel = require('./models/billingModel');

async function testActivateSubscription() {
  console.log('🧪 Testing activateSubscription Function');
  console.log('='.repeat(50));
  
  try {
    const userId = 286; // Ticaloan's user ID
    const subscriptionId = 133; // From debug output
    
    // First, reset subscription to pending for testing
    console.log('\n📋 STEP 1: Reset subscription to pending for testing');
    await pool.query(`
      UPDATE customer_subscriptions 
      SET status = 'pending_payment', payment_status = 'pending'
      WHERE subscription_id = $1
    `, [subscriptionId]);
    
    // Check current invoice status
    console.log('\n💰 STEP 2: Check invoice status before activation');
    const invoiceQuery = `
      SELECT invoice_id, status, amount
      FROM invoices 
      WHERE subscription_id = $1 
        AND status IN ('unpaid', 'partially_paid', 'overdue')
      ORDER BY COALESCE(due_date, created_at) DESC, created_at DESC
      LIMIT 1
    `;
    const invoiceResult = await pool.query(invoiceQuery, [subscriptionId]);
    
    if (invoiceResult.rows.length > 0) {
      const invoice = invoiceResult.rows[0];
      console.log(`✅ Found target invoice: ${invoice.invoice_id}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Amount: ₱${invoice.amount}`);
      
      // Test activateSubscription
      console.log('\n🔧 STEP 3: Testing activateSubscription');
      const paymentData = {
        amount: 199,
        payment_method: 'Manual GCash',
        reference_number: 'TEST-OCR-001',
        notes: 'Test OCR payment'
      };
      
      console.log('Payment data:', paymentData);
      
      const result = await billingModel.activateSubscription(subscriptionId, paymentData);
      console.log('✅ activateSubscription completed');
      console.log('Result:', result);
      
      // Check if payment was created
      console.log('\n💳 STEP 4: Check if payment was created');
      const paymentCheck = await pool.query(`
        SELECT p.*, i.subscription_id
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        WHERE i.subscription_id = $1
        ORDER BY p.created_at DESC
        LIMIT 1
      `, [subscriptionId]);
      
      if (paymentCheck.rows.length > 0) {
        const payment = paymentCheck.rows[0];
        console.log('✅ Payment created successfully:');
        console.log(`   Payment ID: ${payment.payment_id}`);
        console.log(`   Amount: ₱${payment.amount}`);
        console.log(`   Method: ${payment.payment_method}`);
        console.log(`   Reference: ${payment.reference_number}`);
        console.log(`   Notes: ${payment.notes}`);
      } else {
        console.log('❌ No payment was created');
      }
      
      // Check subscription status
      console.log('\n📋 STEP 5: Check subscription status after activation');
      const subCheck = await pool.query(`
        SELECT status, payment_status, payment_confirmed_at
        FROM customer_subscriptions
        WHERE subscription_id = $1
      `, [subscriptionId]);
      
      if (subCheck.rows.length > 0) {
        const sub = subCheck.rows[0];
        console.log('✅ Subscription status:');
        console.log(`   Status: ${sub.status}`);
        console.log(`   Payment Status: ${sub.payment_status}`);
        console.log(`   Confirmed At: ${sub.payment_confirmed_at}`);
      }
      
    } else {
      console.log('❌ No unpaid invoice found for this subscription');
      console.log('💡 This might be why payment creation is failing');
      
      // Show all invoices
      const allInvoices = await pool.query(`
        SELECT invoice_id, status, amount, due_date
        FROM invoices 
        WHERE subscription_id = $1
        ORDER BY created_at DESC
      `, [subscriptionId]);
      
      console.log('\n📄 All invoices for this subscription:');
      allInvoices.rows.forEach((inv, index) => {
        console.log(`  ${index + 1}. Invoice ${inv.invoice_id}: ${inv.status} - ₱${inv.amount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
  }
}

testActivateSubscription();
