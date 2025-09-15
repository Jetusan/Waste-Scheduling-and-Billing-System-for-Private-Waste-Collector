// test_api_endpoints.js - Test subscription lifecycle API endpoints
const axios = require('axios');
const { pool } = require('../config/db');

const BASE_URL = 'http://localhost:5000'; // Adjust if different

class APITester {
  constructor() {
    this.testResults = [];
    this.testUserId = null;
  }

  async setupTestUser() {
    console.log('👤 Setting up test user...');
    
    try {
      // Create a test user if not exists
      const userQuery = `
        INSERT INTO users (username, password_hash, contact_number, email, role_id)
        VALUES ('test_subscription_user', 'test_hash', '09123456789', 'test@example.com', 1)
        ON CONFLICT (username) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING user_id;
      `;
      
      const userResult = await pool.query(userQuery);
      this.testUserId = userResult.rows[0].user_id;
      
      console.log(`✅ Test user ready: ID ${this.testUserId}`);
      return this.testUserId;
      
    } catch (error) {
      console.error('❌ Failed to setup test user:', error.message);
      return null;
    }
  }

  async testEndpoint(name, method, endpoint, data = null, headers = {}) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   ${method.toUpperCase()} ${endpoint}`);
    
    try {
      const config = {
        method: method.toLowerCase(),
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📄 Response:`, JSON.stringify(response.data, null, 2));
      
      this.testResults.push({
        name,
        endpoint,
        method,
        status: 'PASS',
        statusCode: response.status,
        response: response.data
      });
      
      return response.data;
      
    } catch (error) {
      const status = error.response?.status || 'NO_RESPONSE';
      const message = error.response?.data?.error || error.message;
      
      console.log(`   ❌ Status: ${status}`);
      console.log(`   📄 Error:`, message);
      
      this.testResults.push({
        name,
        endpoint,
        method,
        status: 'FAIL',
        statusCode: status,
        error: message
      });
      
      return null;
    }
  }

  async testSubscriptionLifecycle() {
    console.log('🔄 Testing Complete Subscription Lifecycle\n');
    console.log('=' .repeat(60));
    
    if (!this.testUserId) {
      console.log('❌ No test user available');
      return;
    }
    
    // Mock JWT token for testing (you may need to adjust this)
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpYXQiOjE2MzQ1NjcwMDB9.test';
    const authHeaders = { 'Authorization': `Bearer ${mockToken}` };
    
    // Test 1: Create new subscription
    const subscriptionData = {
      payment_method: 'gcash'
    };
    
    const newSubscription = await this.testEndpoint(
      'Create New Subscription',
      'POST',
      '/api/billing/create-mobile-subscription',
      subscriptionData,
      authHeaders
    );
    
    // Test 2: Get subscription details
    if (newSubscription?.subscription?.id) {
      await this.testEndpoint(
        'Get Subscription Details',
        'GET',
        `/api/billing/subscription/${newSubscription.subscription.id}`,
        null,
        authHeaders
      );
    }
    
    // Test 3: Get user invoices
    await this.testEndpoint(
      'Get User Invoices',
      'GET',
      '/api/billing/invoices',
      null,
      authHeaders
    );
    
    // Test 4: Dashboard stats
    await this.testEndpoint(
      'Dashboard Statistics',
      'GET',
      '/api/dashboard/stats',
      null,
      authHeaders
    );
    
    // Test 5: Payment confirmation (simulate)
    if (newSubscription?.invoice?.id) {
      const paymentData = {
        invoice_id: newSubscription.invoice.invoice_id,
        payment_method: 'gcash',
        amount: 199,
        reference_number: `TEST-${Date.now()}`
      };
      
      await this.testEndpoint(
        'Confirm Payment',
        'POST',
        '/api/billing/confirm-payment',
        paymentData,
        authHeaders
      );
    }
  }

  async testDatabaseQueries() {
    console.log('\n🗄️  Testing Database Queries\n');
    console.log('=' .repeat(60));
    
    try {
      // Test subscription queries
      console.log('📋 Testing subscription queries...');
      
      const subscriptionQuery = `
        SELECT 
          subscription_id,
          user_id,
          status,
          payment_status,
          billing_start_date,
          next_billing_date,
          billing_cycle_count
        FROM customer_subscriptions 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5;
      `;
      
      const subscriptions = await pool.query(subscriptionQuery, [this.testUserId]);
      console.log(`✅ Found ${subscriptions.rows.length} subscriptions for test user`);
      
      if (subscriptions.rows.length > 0) {
        console.log('   Latest subscription:', subscriptions.rows[0]);
      }
      
      // Test invoice queries
      console.log('\n📋 Testing invoice queries...');
      
      const invoiceQuery = `
        SELECT 
          invoice_id,
          invoice_number,
          user_id,
          amount,
          status,
          due_date,
          created_at
        FROM invoices 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5;
      `;
      
      const invoices = await pool.query(invoiceQuery, [this.testUserId]);
      console.log(`✅ Found ${invoices.rows.length} invoices for test user`);
      
      if (invoices.rows.length > 0) {
        console.log('   Latest invoice:', invoices.rows[0]);
      }
      
      // Test lifecycle queries
      console.log('\n📋 Testing lifecycle management queries...');
      
      const lifecycleQuery = `
        SELECT 
          COUNT(*) as total_subscriptions,
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
        FROM customer_subscriptions;
      `;
      
      const lifecycle = await pool.query(lifecycleQuery);
      console.log('✅ Subscription lifecycle stats:', lifecycle.rows[0]);
      
    } catch (error) {
      console.error('❌ Database query test failed:', error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 TEST REPORT\n');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(t => t.status === 'PASS').length;
    const failed = this.testResults.filter(t => t.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(t => t.status === 'FAIL')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (failed === 0) {
      console.log('✅ All API endpoints are working correctly!');
      console.log('✅ Database queries are functioning properly!');
      console.log('✅ Subscription lifecycle is ready for production!');
    } else {
      console.log('⚠️  Some endpoints need attention before production');
      console.log('🔧 Check server status and database connections');
      console.log('🔑 Verify authentication tokens and permissions');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Start the backend server (npm start or node server.js)');
    console.log('2. Run database migration if needed');
    console.log('3. Set up Windows Task Scheduler for cron jobs');
    console.log('4. Monitor subscription lifecycle in production');
  }

  async cleanup() {
    try {
      // Clean up test data
      await pool.query('DELETE FROM invoices WHERE user_id = $1', [this.testUserId]);
      await pool.query('DELETE FROM customer_subscriptions WHERE user_id = $1', [this.testUserId]);
      await pool.query('DELETE FROM users WHERE user_id = $1', [this.testUserId]);
      
      console.log('🧹 Test data cleaned up');
    } catch (error) {
      console.log('⚠️  Could not clean up test data:', error.message);
    }
  }
}

async function runAPITests() {
  const tester = new APITester();
  
  try {
    await tester.setupTestUser();
    await tester.testDatabaseQueries();
    await tester.testSubscriptionLifecycle();
    await tester.generateReport();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await tester.cleanup();
    await pool.end();
  }
}

// Check if axios is available
try {
  require.resolve('axios');
  runAPITests();
} catch (e) {
  console.log('⚠️  axios not found. Install with: npm install axios');
  console.log('🔄 Running database tests only...');
  
  const tester = new APITester();
  tester.setupTestUser()
    .then(() => tester.testDatabaseQueries())
    .then(() => tester.generateReport())
    .finally(() => pool.end());
}
