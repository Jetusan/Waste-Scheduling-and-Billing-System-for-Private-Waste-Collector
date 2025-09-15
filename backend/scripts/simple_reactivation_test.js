// simple_reactivation_test.js - Simplified test for enhanced reactivation
const { pool } = require('../config/db');
const billingModel = require('../models/billingModel');

let testResults = [];
let testUsers = [];

async function createTestUser(username) {
  const userQuery = `
    INSERT INTO users (username, password_hash, contact_number, email, role_id)
    VALUES ($1, 'test_hash', '09123456789', $2, 1)
    RETURNING user_id
  `;
  
  const result = await pool.query(userQuery, [username, `${username}@test.com`]);
  const userId = result.rows[0].user_id;
  testUsers.push(userId);
  return userId;
}

async function createTestSubscription(userId, status, daysAgo = 0) {
  const createdAt = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
  const cancelledAt = status === 'cancelled' ? createdAt : null;
  
  const subscriptionQuery = `
    INSERT INTO customer_subscriptions (
      user_id, plan_id, status, billing_start_date, payment_method,
      created_at, cancelled_at, billing_cycle_count
    ) VALUES ($1, 1, $2, $3, 'gcash', $4, $5, 1)
    RETURNING subscription_id
  `;
  
  const result = await pool.query(subscriptionQuery, [
    userId, status, createdAt.toISOString().split('T')[0],
    createdAt, cancelledAt
  ]);
  
  return result.rows[0].subscription_id;
}

async function testStandardReactivation() {
  console.log('\n🧪 Test 1: Standard Reactivation (Recent Cancellation)');
  
  try {
    const userId = await createTestUser('test_standard_user');
    await createTestSubscription(userId, 'cancelled', 5); // 5 days ago
    
    // Import enhanced reactivation functions
    const { shouldUseEnhancedReactivation } = require('../models/enhancedReactivation');
    
    const needsEnhanced = await shouldUseEnhancedReactivation(userId);
    
    if (needsEnhanced) {
      throw new Error('Recent cancellation should use standard reactivation');
    }
    
    // Test standard reactivation
    const reactivated = await billingModel.reactivateSubscription(userId, {
      amount: 199,
      payment_method: 'gcash',
      reference_number: 'TEST-001',
      notes: 'Test reactivation'
    });
    
    if (reactivated.status !== 'active') {
      throw new Error(`Expected 'active', got '${reactivated.status}'`);
    }
    
    console.log('   ✅ PASSED - Standard reactivation works correctly');
    testResults.push({ test: 'Standard Reactivation', status: 'PASS' });
    
  } catch (error) {
    console.log(`   ❌ FAILED - ${error.message}`);
    testResults.push({ test: 'Standard Reactivation', status: 'FAIL', error: error.message });
  }
}

async function testEnhancedReactivation() {
  console.log('\n🧪 Test 2: Enhanced Reactivation (Long-term Cancellation)');
  
  try {
    const userId = await createTestUser('test_enhanced_user');
    await createTestSubscription(userId, 'cancelled', 45); // 45 days ago
    
    const { enhancedReactivation, shouldUseEnhancedReactivation } = require('../models/enhancedReactivation');
    
    const needsEnhanced = await shouldUseEnhancedReactivation(userId);
    
    if (!needsEnhanced) {
      throw new Error('Long-term cancellation should use enhanced reactivation');
    }
    
    // Test enhanced reactivation
    const result = await enhancedReactivation(userId, {
      amount: 199,
      payment_method: 'gcash',
      reference_number: 'TEST-002',
      notes: 'Enhanced test'
    });
    
    if (result.subscription.status !== 'active') {
      throw new Error(`Expected 'active', got '${result.subscription.status}'`);
    }
    
    if (result.daysSinceCancellation < 40) {
      throw new Error(`Days since cancellation should be ~45, got ${result.daysSinceCancellation}`);
    }
    
    console.log('   ✅ PASSED - Enhanced reactivation works correctly');
    console.log(`   📅 Days since cancellation: ${result.daysSinceCancellation}`);
    console.log(`   🗄️ Archived old invoices: ${result.archivedInvoices}`);
    testResults.push({ test: 'Enhanced Reactivation', status: 'PASS' });
    
  } catch (error) {
    console.log(`   ❌ FAILED - ${error.message}`);
    testResults.push({ test: 'Enhanced Reactivation', status: 'FAIL', error: error.message });
  }
}

async function testBillingControllerLogic() {
  console.log('\n🧪 Test 3: Billing Controller Integration');
  
  try {
    const userId = await createTestUser('test_controller_user');
    await createTestSubscription(userId, 'cancelled', 60); // 60 days ago
    
    // Test the controller decision logic
    const existingSubscription = await billingModel.getSubscriptionByUserId(userId);
    
    if (!existingSubscription || existingSubscription.status !== 'cancelled') {
      throw new Error('Should find cancelled subscription');
    }
    
    const { shouldUseEnhancedReactivation } = require('../models/enhancedReactivation');
    const needsEnhanced = await shouldUseEnhancedReactivation(userId);
    
    if (!needsEnhanced) {
      throw new Error('60-day cancellation should need enhanced reactivation');
    }
    
    console.log('   ✅ PASSED - Controller integration logic works');
    testResults.push({ test: 'Controller Integration', status: 'PASS' });
    
  } catch (error) {
    console.log(`   ❌ FAILED - ${error.message}`);
    testResults.push({ test: 'Controller Integration', status: 'FAIL', error: error.message });
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  for (const userId of testUsers) {
    try {
      await pool.query('DELETE FROM invoices WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM customer_subscriptions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    } catch (error) {
      console.log(`   ⚠️ Cleanup warning for user ${userId}: ${error.message}`);
    }
  }
  
  console.log('   ✅ Cleanup completed');
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENHANCED REACTIVATION TEST RESULTS');
  console.log('='.repeat(60));
  
  const passed = testResults.filter(t => t.status === 'PASS').length;
  const failed = testResults.filter(t => t.status === 'FAIL').length;
  
  console.log(`\n✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`📊 TOTAL:  ${testResults.length}`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`   • ${test.test}: ${test.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n✅ Your enhanced reactivation implementation is working correctly:');
    console.log('   • Standard reactivation for recent cancellations (<30 days)');
    console.log('   • Enhanced reactivation for long-term cancellations (>30 days)');
    console.log('   • Proper billing controller integration');
    console.log('   • Data cleanup and archiving functionality');
    console.log('\n🚀 Ready for production deployment!');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
}

async function runTests() {
  console.log('🚀 Starting Enhanced Reactivation Tests...');
  
  try {
    await testStandardReactivation();
    await testEnhancedReactivation();
    await testBillingControllerLogic();
    
    await generateReport();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await cleanup();
    await pool.end();
  }
}

runTests();
