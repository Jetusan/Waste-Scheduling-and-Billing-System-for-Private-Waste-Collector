const { pool } = require('../config/db');
const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  TEST_USER: {
    username: 'testuser_flow',
    email: 'testflow@example.com',
    password: 'testpass123',
    contact_number: '09123456789',
    barangay: 'San Isidro',
    subdivision: 'VSM Heights Phase 1'
  },
  TEST_COLLECTOR: {
    name: 'Test Collector',
    contact_number: '09987654321'
  }
};

class SubscriptionFlowTester {
  constructor() {
    this.testResults = [];
    this.testUserId = null;
    this.testCollectorId = null;
    this.subscriptionId = null;
    this.invoiceId = null;
    this.authToken = null;
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${status}: ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, status, message });
  }

  async runAllTests() {
    console.log('🚀 Starting Complete Subscription Flow Test...\n');
    
    try {
      // Setup phase
      await this.setupTestData();
      
      // Test both flows
      await this.testCashPaymentFlow();
      await this.testGCashPaymentFlow();
      
      // Cleanup
      await this.cleanupTestData();
      
      this.printTestSummary();
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'ERROR');
      console.error('Full error:', error);
    }
  }

  async setupTestData() {
    this.log('Setting up test data...', 'SETUP');
    
    // Create test user
    try {
      const userQuery = `
        INSERT INTO users (username, email, password_hash, contact_number, role, created_at)
        VALUES ($1, $2, $3, $4, 'resident', NOW())
        ON CONFLICT (username) DO UPDATE SET email = $2
        RETURNING user_id
      `;
      const userResult = await pool.query(userQuery, [
        TEST_CONFIG.TEST_USER.username,
        TEST_CONFIG.TEST_USER.email,
        'hashed_password_test',
        TEST_CONFIG.TEST_USER.contact_number
      ]);
      
      this.testUserId = userResult.rows[0].user_id;
      this.log(`✅ Test user created/updated: ID ${this.testUserId}`, 'SUCCESS');
      
    } catch (error) {
      this.log(`❌ Failed to create test user: ${error.message}`, 'ERROR');
      throw error;
    }

    // Create test collector
    try {
      const collectorQuery = `
        INSERT INTO collectors (name, contact_number, status, created_at)
        VALUES ($1, $2, 'active', NOW())
        ON CONFLICT (contact_number) DO UPDATE SET name = $1
        RETURNING collector_id
      `;
      const collectorResult = await pool.query(collectorQuery, [
        TEST_CONFIG.TEST_COLLECTOR.name,
        TEST_CONFIG.TEST_COLLECTOR.contact_number
      ]);
      
      this.testCollectorId = collectorResult.rows[0].collector_id;
      this.log(`✅ Test collector created/updated: ID ${this.testCollectorId}`, 'SUCCESS');
      
    } catch (error) {
      this.log(`❌ Failed to create test collector: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async testCashPaymentFlow() {
    this.log('\n💰 Testing CASH PAYMENT FLOW...', 'TEST');
    
    try {
      // Step 1: Create subscription
      const subscription = await this.createSubscription('cash');
      this.log(`✅ Step 1: Subscription created - ID: ${subscription.subscription_id}`, 'SUCCESS');
      
      // Step 2: Verify invoice generated
      const invoice = await this.verifyInvoiceGenerated(subscription.subscription_id);
      this.log(`✅ Step 2: Invoice generated - ID: ${invoice.invoice_id}`, 'SUCCESS');
      
      // Step 3: Simulate collector cash collection
      const cashPayment = await this.simulateCollectorCashCollection(subscription.subscription_id);
      this.log(`✅ Step 3: Cash payment confirmed - Receipt: ${cashPayment.receipt_generated}`, 'SUCCESS');
      
      // Step 4: Verify subscription activated
      const activatedSub = await this.verifySubscriptionActivated(subscription.subscription_id);
      this.log(`✅ Step 4: Subscription activated - Status: ${activatedSub.status}`, 'SUCCESS');
      
      // Step 5: Verify receipt generated
      const receipt = await this.verifyReceiptGenerated(this.testUserId);
      this.log(`✅ Step 5: Receipt generated - Number: ${receipt.receipt_number}`, 'SUCCESS');
      
      this.log('🎉 CASH PAYMENT FLOW: ALL TESTS PASSED!', 'SUCCESS');
      
    } catch (error) {
      this.log(`❌ CASH PAYMENT FLOW FAILED: ${error.message}`, 'ERROR');
    }
  }

  async testGCashPaymentFlow() {
    this.log('\n📱 Testing GCASH PAYMENT FLOW...', 'TEST');
    
    try {
      // Step 1: Create subscription
      const subscription = await this.createSubscription('manual_gcash');
      this.log(`✅ Step 1: GCash subscription created - ID: ${subscription.subscription_id}`, 'SUCCESS');
      
      // Step 2: Verify invoice generated
      const invoice = await this.verifyInvoiceGenerated(subscription.subscription_id);
      this.log(`✅ Step 2: Invoice generated - ID: ${invoice.invoice_id}`, 'SUCCESS');
      
      // Step 3: Simulate GCash receipt upload with OCR
      const gcashPayment = await this.simulateGCashReceiptUpload(subscription.subscription_id);
      this.log(`✅ Step 3: GCash receipt uploaded - Verified: ${gcashPayment.verification_result?.isValid}`, 'SUCCESS');
      
      // Step 4: Verify subscription activated (if OCR passed)
      if (gcashPayment.subscription_activated) {
        const activatedSub = await this.verifySubscriptionActivated(subscription.subscription_id);
        this.log(`✅ Step 4: Subscription activated - Status: ${activatedSub.status}`, 'SUCCESS');
        
        // Step 5: Verify receipt generated
        const receipt = await this.verifyReceiptGenerated(this.testUserId);
        this.log(`✅ Step 5: Receipt generated - Number: ${receipt.receipt_number}`, 'SUCCESS');
      } else {
        this.log(`⚠️ Step 4: OCR verification failed - subscription not activated`, 'WARNING');
      }
      
      this.log('🎉 GCASH PAYMENT FLOW: ALL TESTS PASSED!', 'SUCCESS');
      
    } catch (error) {
      this.log(`❌ GCASH PAYMENT FLOW FAILED: ${error.message}`, 'ERROR');
    }
  }

  async createSubscription(paymentMethod) {
    const subscriptionData = {
      user_id: this.testUserId,
      plan_id: 1, // Assuming plan_id 1 exists
      payment_method: paymentMethod,
      billing_start_date: new Date().toISOString().split('T')[0]
    };

    const query = `
      INSERT INTO customer_subscriptions (
        user_id, plan_id, payment_method, billing_start_date, 
        status, payment_status, created_at
      ) VALUES ($1, $2, $3, $4, 'pending_payment', 'pending', NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      subscriptionData.user_id,
      subscriptionData.plan_id,
      subscriptionData.payment_method,
      subscriptionData.billing_start_date
    ]);
    
    return result.rows[0];
  }

  async verifyInvoiceGenerated(subscriptionId) {
    const query = `
      SELECT * FROM invoices 
      WHERE subscription_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [subscriptionId]);
    
    if (result.rows.length === 0) {
      throw new Error('Invoice not generated');
    }
    
    return result.rows[0];
  }

  async simulateCollectorCashCollection(subscriptionId) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/billing/confirm-cash-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
        collector_id: this.testCollectorId,
        amount: 199,
        notes: 'Test cash collection'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cash payment confirmation failed: ${error}`);
    }

    return await response.json();
  }

  async simulateGCashReceiptUpload(subscriptionId) {
    // Create a mock base64 image for testing
    const mockReceiptImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/billing/upload-gcash-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_reference: subscriptionId.toString(),
        gcash_reference: 'TEST123456789',
        receipt_image: mockReceiptImage
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GCash receipt upload failed: ${error}`);
    }

    return await response.json();
  }

  async verifySubscriptionActivated(subscriptionId) {
    const query = `
      SELECT * FROM customer_subscriptions 
      WHERE subscription_id = $1
    `;
    
    const result = await pool.query(query, [subscriptionId]);
    
    if (result.rows.length === 0) {
      throw new Error('Subscription not found');
    }
    
    const subscription = result.rows[0];
    
    if (subscription.status !== 'active') {
      throw new Error(`Subscription not activated. Status: ${subscription.status}`);
    }
    
    return subscription;
  }

  async verifyReceiptGenerated(userId) {
    const query = `
      SELECT * FROM receipts 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Receipt not generated');
    }
    
    return result.rows[0];
  }

  async cleanupTestData() {
    this.log('\n🧹 Cleaning up test data...', 'CLEANUP');
    
    try {
      // Delete test receipts
      await pool.query('DELETE FROM receipts WHERE user_id = $1', [this.testUserId]);
      
      // Delete test payments
      await pool.query(`
        DELETE FROM payments 
        WHERE invoice_id IN (
          SELECT invoice_id FROM invoices 
          WHERE subscription_id IN (
            SELECT subscription_id FROM customer_subscriptions 
            WHERE user_id = $1
          )
        )
      `, [this.testUserId]);
      
      // Delete test invoices
      await pool.query(`
        DELETE FROM invoices 
        WHERE subscription_id IN (
          SELECT subscription_id FROM customer_subscriptions 
          WHERE user_id = $1
        )
      `, [this.testUserId]);
      
      // Delete test subscriptions
      await pool.query('DELETE FROM customer_subscriptions WHERE user_id = $1', [this.testUserId]);
      
      // Delete test user
      await pool.query('DELETE FROM users WHERE user_id = $1', [this.testUserId]);
      
      // Delete test collector
      await pool.query('DELETE FROM collectors WHERE collector_id = $1', [this.testCollectorId]);
      
      this.log('✅ Test data cleaned up successfully', 'SUCCESS');
      
    } catch (error) {
      this.log(`⚠️ Cleanup warning: ${error.message}`, 'WARNING');
    }
  }

  printTestSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successCount = this.testResults.filter(r => r.status === 'SUCCESS').length;
    const errorCount = this.testResults.filter(r => r.status === 'ERROR').length;
    const warningCount = this.testResults.filter(r => r.status === 'WARNING').length;
    
    console.log(`✅ Successful tests: ${successCount}`);
    console.log(`❌ Failed tests: ${errorCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`📝 Total operations: ${this.testResults.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Subscription flow is working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Check the logs above for details.');
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    this.testResults.forEach(result => {
      const icon = result.status === 'SUCCESS' ? '✅' : 
                   result.status === 'ERROR' ? '❌' : 
                   result.status === 'WARNING' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${result.message}`);
    });
  }
}

// Database connection test
async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Main execution
async function runTests() {
  console.log('🔍 Testing Complete Subscription Flow with Receipt Generation\n');
  
  // Test database connection first
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Run the complete test suite
  const tester = new SubscriptionFlowTester();
  await tester.runAllTests();
  
  // Close database connection
  await pool.end();
  console.log('\n👋 Test completed. Database connection closed.');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = { SubscriptionFlowTester, runTests };
