// test_enhanced_reactivation.js - Comprehensive test for enhanced reactivation implementation
const { pool } = require('../config/db');
const billingModel = require('../models/billingModel');
const { enhancedReactivation, shouldUseEnhancedReactivation, getReactivationSummary } = require('../models/enhancedReactivation');

class ReactivationTester {
  constructor() {
    this.testResults = [];
    this.testUsers = [];
  }

  log(section, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${section}] ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async createTestUser(username, scenario) {
    this.log('SETUP', `Creating test user: ${username} for scenario: ${scenario}`);
    
    const userQuery = `
      INSERT INTO users (username, password_hash, contact_number, email, role_id)
      VALUES ($1, 'test_hash', '09123456789', $2, 1)
      RETURNING user_id
    `;
    
    const result = await pool.query(userQuery, [username, `${username}@test.com`]);
    const userId = result.rows[0].user_id;
    
    this.testUsers.push({ userId, username, scenario });
    return userId;
  }

  async createTestSubscription(userId, status, daysAgo = 0) {
    this.log('SETUP', `Creating test subscription with status: ${status}, ${daysAgo} days ago`);
    
    const createdAt = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
    const cancelledAt = status === 'cancelled' ? createdAt : null;
    const suspendedAt = status === 'suspended' ? createdAt : null;
    
    const subscriptionQuery = `
      INSERT INTO customer_subscriptions (
        user_id, plan_id, status, billing_start_date, payment_method,
        created_at, cancelled_at, suspended_at, billing_cycle_count
      ) VALUES ($1, 1, $2, $3, 'gcash', $4, $5, $6, 1)
      RETURNING subscription_id
    `;
    
    const result = await pool.query(subscriptionQuery, [
      userId, status, createdAt.toISOString().split('T')[0],
      createdAt, cancelledAt, suspendedAt
    ]);
    
    return result.rows[0].subscription_id;
  }

  async createTestInvoices(userId, subscriptionId, count = 2, status = 'unpaid') {
    this.log('SETUP', `Creating ${count} test invoices with status: ${status}`);
    
    const invoices = [];
    for (let i = 0; i < count; i++) {
      const dueDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
      const invoiceQuery = `
        INSERT INTO invoices (user_id, subscription_id, plan_id, amount, status, due_date, notes)
        VALUES ($1, $2, 1, 199, $3, $4, 'Test invoice')
        RETURNING invoice_id, invoice_number
      `;
      
      const result = await pool.query(invoiceQuery, [userId, subscriptionId, status, dueDate]);
      invoices.push(result.rows[0]);
    }
    
    return invoices;
  }

  async testStandardReactivation() {
    this.log('TEST', '🧪 Testing Standard Reactivation (Recent Cancellation)');
    
    try {
      // Create user with recently cancelled subscription (5 days ago)
      const userId = await this.createTestUser('test_standard_reactivation', 'recent_cancellation');
      const subscriptionId = await this.createTestSubscription(userId, 'cancelled', 5);
      await this.createTestInvoices(userId, subscriptionId, 1, 'unpaid');
      
      // Test shouldUseEnhancedReactivation
      const needsEnhanced = await shouldUseEnhancedReactivation(userId);
      
      if (needsEnhanced) {
        throw new Error('Recent cancellation should use standard reactivation');
      }
      
      // Test standard reactivation
      const reactivatedSub = await billingModel.reactivateSubscription(userId, {
        amount: 199,
        payment_method: 'gcash',
        reference_number: 'TEST-STANDARD-001',
        notes: 'Standard reactivation test'
      });
      
      // Verify results
      if (reactivatedSub.status !== 'active') {
        throw new Error(`Expected status 'active', got '${reactivatedSub.status}'`);
      }
      
      if (!reactivatedSub.reactivated_at) {
        throw new Error('reactivated_at should be set');
      }
      
      this.testResults.push({
        test: 'Standard Reactivation',
        status: 'PASS',
        details: 'Recent cancellation correctly uses standard reactivation'
      });
      
      this.log('TEST', '✅ Standard Reactivation Test PASSED');
      
    } catch (error) {
      this.testResults.push({
        test: 'Standard Reactivation',
        status: 'FAIL',
        error: error.message
      });
      this.log('TEST', '❌ Standard Reactivation Test FAILED', { error: error.message });
    }
  }

  async testEnhancedReactivation() {
    this.log('TEST', '🧪 Testing Enhanced Reactivation (Long-term Cancellation)');
    
    try {
      // Create user with long-term cancelled subscription (45 days ago)
      const userId = await this.createTestUser('test_enhanced_reactivation', 'long_term_cancellation');
      const subscriptionId = await this.createTestSubscription(userId, 'cancelled', 45);
      const oldInvoices = await this.createTestInvoices(userId, subscriptionId, 3, 'unpaid');
      
      // Test shouldUseEnhancedReactivation
      const needsEnhanced = await shouldUseEnhancedReactivation(userId);
      
      if (!needsEnhanced) {
        throw new Error('Long-term cancellation should use enhanced reactivation');
      }
      
      // Test enhanced reactivation
      const reactivationResult = await enhancedReactivation(userId, {
        amount: 199,
        payment_method: 'gcash',
        reference_number: 'TEST-ENHANCED-001',
        notes: 'Enhanced reactivation test'
      });
      
      // Verify results
      if (reactivationResult.subscription.status !== 'active') {
        throw new Error(`Expected status 'active', got '${reactivationResult.subscription.status}'`);
      }
      
      if (reactivationResult.reactivationType !== 'standard' && reactivationResult.daysSinceCancellation < 40) {
        throw new Error('Days since cancellation should be around 45');
      }
      
      if (!reactivationResult.archivedInvoices) {
        throw new Error('Old invoices should be archived');
      }
      
      // Check if old invoices were archived
      const archivedCheck = await pool.query(
        'SELECT COUNT(*) as count FROM invoices WHERE user_id = $1 AND status = $2',
        [userId, 'archived']
      );
      
      if (parseInt(archivedCheck.rows[0].count) === 0) {
        throw new Error('Old invoices should have been archived');
      }
      
      this.testResults.push({
        test: 'Enhanced Reactivation',
        status: 'PASS',
        details: 'Long-term cancellation correctly uses enhanced reactivation with cleanup'
      });
      
      this.log('TEST', '✅ Enhanced Reactivation Test PASSED');
      
    } catch (error) {
      this.testResults.push({
        test: 'Enhanced Reactivation',
        status: 'FAIL',
        error: error.message
      });
      this.log('TEST', '❌ Enhanced Reactivation Test FAILED', { error: error.message });
    }
  }

  async testReactivationSummary() {
    this.log('TEST', '🧪 Testing Reactivation Summary Function');
    
    try {
      const userId = await this.createTestUser('test_summary', 'summary_test');
      const subscriptionId = await this.createTestSubscription(userId, 'suspended', 15);
      await this.createTestInvoices(userId, subscriptionId, 2, 'overdue');
      
      const summary = await getReactivationSummary(userId);
      
      if (!summary) {
        throw new Error('Summary should not be null');
      }
      
      if (summary.status !== 'suspended') {
        throw new Error(`Expected status 'suspended', got '${summary.status}'`);
      }
      
      if (parseInt(summary.unpaid_invoices) !== 2) {
        throw new Error(`Expected 2 unpaid invoices, got ${summary.unpaid_invoices}`);
      }
      
      this.testResults.push({
        test: 'Reactivation Summary',
        status: 'PASS',
        details: 'Summary function returns correct subscription and invoice data'
      });
      
      this.log('TEST', '✅ Reactivation Summary Test PASSED');
      
    } catch (error) {
      this.testResults.push({
        test: 'Reactivation Summary',
        status: 'FAIL',
        error: error.message
      });
      this.log('TEST', '❌ Reactivation Summary Test FAILED', { error: error.message });
    }
  }

  async testEdgeCases() {
    this.log('TEST', '🧪 Testing Edge Cases');
    
    try {
      // Test 1: User with no subscription
      const newUserId = await this.createTestUser('test_no_subscription', 'no_subscription');
      
      try {
        await enhancedReactivation(newUserId, { amount: 199, payment_method: 'gcash' });
        throw new Error('Should have failed for user with no subscription');
      } catch (error) {
        if (!error.message.includes('No previous subscription found')) {
          throw error;
        }
      }
      
      // Test 2: User with active subscription
      const activeUserId = await this.createTestUser('test_active_user', 'active_subscription');
      await this.createTestSubscription(activeUserId, 'active', 0);
      
      const needsEnhanced = await shouldUseEnhancedReactivation(activeUserId);
      if (needsEnhanced) {
        throw new Error('Active subscription should not need reactivation');
      }
      
      this.testResults.push({
        test: 'Edge Cases',
        status: 'PASS',
        details: 'Properly handles users with no subscription and active subscriptions'
      });
      
      this.log('TEST', '✅ Edge Cases Test PASSED');
      
    } catch (error) {
      this.testResults.push({
        test: 'Edge Cases',
        status: 'FAIL',
        error: error.message
      });
      this.log('TEST', '❌ Edge Cases Test FAILED', { error: error.message });
    }
  }

  async testBillingControllerIntegration() {
    this.log('TEST', '🧪 Testing Billing Controller Integration');
    
    try {
      // Mock the billing controller logic
      const userId = await this.createTestUser('test_controller_integration', 'controller_test');
      await this.createTestSubscription(userId, 'cancelled', 60);
      
      // Simulate the controller logic
      const existingSubscription = await billingModel.getSubscriptionByUserId(userId);
      
      if (!existingSubscription) {
        throw new Error('Should find existing subscription');
      }
      
      if (existingSubscription.status !== 'cancelled') {
        throw new Error('Subscription should be cancelled');
      }
      
      // Test the enhanced reactivation decision logic
      const needsEnhanced = await shouldUseEnhancedReactivation(userId);
      
      if (!needsEnhanced) {
        throw new Error('60-day old cancellation should need enhanced reactivation');
      }
      
      this.testResults.push({
        test: 'Controller Integration',
        status: 'PASS',
        details: 'Billing controller integration logic works correctly'
      });
      
      this.log('TEST', '✅ Controller Integration Test PASSED');
      
    } catch (error) {
      this.testResults.push({
        test: 'Controller Integration',
        status: 'FAIL',
        error: error.message
      });
      this.log('TEST', '❌ Controller Integration Test FAILED', { error: error.message });
    }
  }

  async cleanup() {
    this.log('CLEANUP', 'Cleaning up test data...');
    
    try {
      for (const testUser of this.testUsers) {
        // Delete invoices
        await pool.query('DELETE FROM invoices WHERE user_id = $1', [testUser.userId]);
        
        // Delete subscriptions
        await pool.query('DELETE FROM customer_subscriptions WHERE user_id = $1', [testUser.userId]);
        
        // Delete user
        await pool.query('DELETE FROM users WHERE user_id = $1', [testUser.userId]);
        
        this.log('CLEANUP', `Cleaned up test user: ${testUser.username}`);
      }
    } catch (error) {
      this.log('CLEANUP', 'Error during cleanup', { error: error.message });
    }
  }

  generateReport() {
    this.log('REPORT', '📊 Test Results Summary');
    console.log('\n' + '='.repeat(60));
    console.log('ENHANCED REACTIVATION TEST REPORT');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(t => t.status === 'PASS').length;
    const failed = this.testResults.filter(t => t.status === 'FAIL').length;
    
    console.log(`\n✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    console.log(`📊 TOTAL:  ${this.testResults.length}`);
    
    console.log('\nDETAILED RESULTS:');
    console.log('-'.repeat(40));
    
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      console.log(`   ${result.details || result.error}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Enhanced reactivation is working correctly.');
      console.log('\n✅ Your implementation handles:');
      console.log('   • Standard reactivation for recent cancellations');
      console.log('   • Enhanced reactivation for long-term cancellations');
      console.log('   • Proper data cleanup and archiving');
      console.log('   • Edge cases and error handling');
      console.log('   • Billing controller integration');
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review the implementation.');
      console.log('\n🔧 Failed tests need attention before production deployment.');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Review any failed tests and fix issues');
    console.log('2. Run migration script if needed');
    console.log('3. Test with real API endpoints');
    console.log('4. Deploy to production environment');
  }
}

async function runReactivationTests() {
  const tester = new ReactivationTester();
  
  try {
    console.log('🚀 Starting Enhanced Reactivation Tests...\n');
    
    await tester.testStandardReactivation();
    await tester.testEnhancedReactivation();
    await tester.testReactivationSummary();
    await tester.testEdgeCases();
    await tester.testBillingControllerIntegration();
    
    tester.generateReport();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await tester.cleanup();
    await pool.end();
  }
}

// Run tests if called directly
if (require.main === module) {
  runReactivationTests();
}

module.exports = { ReactivationTester, runReactivationTests };
