const pool = require('../config/db');
const billingModel = require('../models/billingModel');
const { shouldUseEnhancedReactivation, enhancedReactivation, getReactivationSummary } = require('../models/enhancedReactivation');

async function runFinalTest() {
  console.log('🚀 Enhanced Reactivation Final Test');
  console.log('===================================\n');
  
  const testResults = [];
  let testUserId = null;
  
  try {
    // Test 1: Create test user
    console.log('📝 Test 1: Creating test user...');
    const timestamp = Date.now();
    const userResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING user_id
    `, [`test_final_${timestamp}`, `test_final_${timestamp}@enhanced.com`, 'hash123']);
    
    testUserId = userResult.rows[0].user_id;
    console.log(`✅ User created with ID: ${testUserId}`);
    testResults.push({ test: 'User Creation', status: 'PASS' });
    
    // Test 2: Create cancelled subscription (45 days ago)
    console.log('\n📝 Test 2: Creating cancelled subscription...');
    const subscriptionResult = await pool.query(`
      INSERT INTO customer_subscriptions (
        user_id, plan_id, status, cancelled_at, billing_start_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING subscription_id
    `, [testUserId, 3, 'cancelled', new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)]);
    
    const subscriptionId = subscriptionResult.rows[0].subscription_id;
    console.log(`✅ Subscription created with ID: ${subscriptionId}`);
    testResults.push({ test: 'Subscription Creation', status: 'PASS' });
    
    // Test 3: Test enhanced reactivation decision
    console.log('\n📝 Test 3: Testing enhanced reactivation decision...');
    try {
      const needsEnhanced = await shouldUseEnhancedReactivation(testUserId);
      console.log(`✅ Enhanced reactivation needed: ${needsEnhanced}`);
      testResults.push({ test: 'Enhanced Decision Logic', status: 'PASS', details: `Needs enhanced: ${needsEnhanced}` });
    } catch (error) {
      console.log(`⚠️ Enhanced decision error: ${error.message}`);
      testResults.push({ test: 'Enhanced Decision Logic', status: 'FAIL', error: error.message });
    }
    
    // Test 4: Test basic reactivation
    console.log('\n📝 Test 4: Testing basic reactivation...');
    try {
      const reactivatedSub = await billingModel.reactivateSubscription(testUserId, {
        amount: 199,
        payment_method: 'gcash',
        reference_number: 'TEST-FINAL-001',
        notes: 'Final test reactivation'
      });
      
      console.log(`✅ Basic reactivation successful!`);
      console.log(`   Status: ${reactivatedSub.status}`);
      console.log(`   Reactivated at: ${reactivatedSub.reactivated_at}`);
      testResults.push({ test: 'Basic Reactivation', status: 'PASS', details: `Status: ${reactivatedSub.status}` });
    } catch (error) {
      console.log(`❌ Basic reactivation failed: ${error.message}`);
      testResults.push({ test: 'Basic Reactivation', status: 'FAIL', error: error.message });
    }
    
    // Test 5: Test enhanced reactivation module
    console.log('\n📝 Test 5: Testing enhanced reactivation module...');
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
        reference_number: 'TEST-FINAL-002',
        notes: 'Enhanced module final test'
      });
      
      console.log(`✅ Enhanced reactivation successful!`);
      console.log(`   Status: ${enhancedResult.subscription.status}`);
      console.log(`   Days since cancellation: ${enhancedResult.daysSinceCancellation}`);
      console.log(`   Archived invoices: ${enhancedResult.archivedInvoices}`);
      console.log(`   Reset schedules: ${enhancedResult.resetSchedules}`);
      testResults.push({ 
        test: 'Enhanced Reactivation Module', 
        status: 'PASS', 
        details: `Days: ${enhancedResult.daysSinceCancellation}, Archived: ${enhancedResult.archivedInvoices}` 
      });
      
    } catch (error) {
      console.log(`❌ Enhanced module failed: ${error.message}`);
      testResults.push({ test: 'Enhanced Reactivation Module', status: 'FAIL', error: error.message });
    }
    
    // Test 6: Test summary function
    console.log('\n📝 Test 6: Testing summary function...');
    try {
      const summary = await getReactivationSummary(testUserId);
      console.log(`✅ Summary retrieved: ${summary ? 'Yes' : 'No'}`);
      if (summary) {
        console.log(`   Status: ${summary.status}`);
      }
      testResults.push({ test: 'Summary Function', status: 'PASS', details: `Summary available: ${!!summary}` });
    } catch (error) {
      console.log(`⚠️ Summary function error: ${error.message}`);
      testResults.push({ test: 'Summary Function', status: 'FAIL', error: error.message });
    }
    
  } catch (error) {
    console.log(`❌ Test suite failed: ${error.message}`);
    testResults.push({ test: 'Test Suite', status: 'FAIL', error: error.message });
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
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('FINAL TEST RESULTS');
  console.log('='.repeat(50));
  
  const passed = testResults.filter(t => t.status === 'PASS').length;
  const failed = testResults.filter(t => t.status === 'FAIL').length;
  
  console.log(`\n✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`📊 TOTAL:  ${testResults.length}`);
  
  console.log('\nDETAILED RESULTS:');
  console.log('-'.repeat(30));
  
  testResults.forEach((result, index) => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.test}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Enhanced reactivation is ready for production!');
  } else {
    console.log('⚠️ Some tests failed. Review the errors above.');
  }
}

// Run the test
runFinalTest().catch(console.error);
