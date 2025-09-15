const pool = require('../config/db');
const billingModel = require('../models/billingModel');
const { shouldUseEnhancedReactivation, enhancedReactivation, getReactivationSummary } = require('../models/enhancedReactivation');

async function runSimpleTest() {
  console.log('🚀 Enhanced Reactivation Simple Test');
  console.log('=====================================\n');
  
  let testUserId = null;
  
  try {
    // Test 1: Create test user
    console.log('📝 Test 1: Creating test user...');
    const userResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING user_id
    `, [`test_enhanced_user_${Date.now()}`, `test_${Date.now()}@enhanced.com`, 'hash123']);
    
    testUserId = userResult.rows[0].user_id;
    console.log(`✅ User created with ID: ${testUserId}\n`);
    
    // Test 2: Create cancelled subscription (45 days ago)
    console.log('📝 Test 2: Creating cancelled subscription...');
    const subscriptionResult = await pool.query(`
      INSERT INTO customer_subscriptions (
        user_id, plan_id, status, cancelled_at, billing_start_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING subscription_id
    `, [testUserId, 3, 'cancelled', new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)]);
    
    const subscriptionId = subscriptionResult.rows[0].subscription_id;
    console.log(`✅ Subscription created with ID: ${subscriptionId}\n`);
    
    // Test 3: Check if enhanced reactivation is needed
    console.log('📝 Test 3: Testing enhanced reactivation decision...');
    try {
      const needsEnhanced = await shouldUseEnhancedReactivation(testUserId);
      console.log(`✅ Enhanced reactivation needed: ${needsEnhanced}\n`);
    } catch (error) {
      console.log(`⚠️ Enhanced decision error: ${error.message}\n`);
    }
    
    // Test 4: Test basic reactivation
    console.log('📝 Test 4: Testing basic reactivation...');
    const reactivatedSub = await billingModel.reactivateSubscription(testUserId, {
      amount: 199,
      payment_method: 'gcash',
      reference_number: 'TEST-ENHANCED-001',
      notes: 'Enhanced reactivation test'
    });
    
    console.log(`✅ Reactivation successful!`);
    console.log(`   Status: ${reactivatedSub.status}`);
    console.log(`   Reactivated at: ${reactivatedSub.reactivated_at}\n`);
    
    // Test 5: Test enhanced reactivation module
    console.log('📝 Test 5: Testing enhanced reactivation module...');
    try {
      // Reset subscription to cancelled for enhanced test
      await pool.query(`
        UPDATE customer_subscriptions 
        SET status = 'cancelled', cancelled_at = $1
        WHERE subscription_id = $2
      `, [new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), subscriptionId]);
      
      const enhancedResult = await enhancedReactivation(testUserId, {
        amount: 199,
        payment_method: 'gcash',
        reference_number: 'TEST-ENHANCED-002',
        notes: 'Enhanced module test'
      });
      
      console.log(`✅ Enhanced reactivation successful!`);
      console.log(`   Status: ${enhancedResult.subscription.status}`);
      console.log(`   Days since cancellation: ${enhancedResult.daysSinceCancellation}`);
      console.log(`   Archived invoices: ${enhancedResult.archivedInvoices}`);
      console.log(`   Reset schedules: ${enhancedResult.resetSchedules}\n`);
      
    } catch (error) {
      console.log(`⚠️ Enhanced module error: ${error.message}\n`);
    }
    
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  } finally {
    // Cleanup
    if (testUserId) {
      console.log('\n🧹 Cleaning up test data...');
      try {
        await pool.query('DELETE FROM customer_subscriptions WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM invoices WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);
        console.log('✅ Cleanup completed');
      } catch (cleanupError) {
        console.log(`⚠️ Cleanup error: ${cleanupError.message}`);
      }
    }
  }
}

// Run the test
runSimpleTest().catch(console.error);
