// Test script for renewal API endpoint
const { pool } = require('./config/db');

async function testRenewalAPI() {
  console.log('🧪 Testing Renewal API Endpoint...\n');
  
  try {
    // Get a test user with active subscription
    console.log('1️⃣ Getting test user credentials...');
    const userQuery = `
      SELECT u.user_id, u.username, u.email, cs.subscription_id, cs.status
      FROM users u
      JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      WHERE cs.status = 'active'
      LIMIT 1
    `;
    const userResult = await pool.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No active subscriptions found for API testing');
      return;
    }
    
    const testUser = userResult.rows[0];
    console.log(`✅ Test user: ${testUser.username} (${testUser.email})`);
    
    // First, we need to get a JWT token for this user
    console.log('\n2️⃣ Testing API endpoint (simulated)...');
    console.log('📝 API Test Details:');
    console.log(`   Endpoint: POST /api/billing/renew-subscription`);
    console.log(`   User ID: ${testUser.user_id}`);
    console.log(`   Subscription ID: ${testUser.subscription_id}`);
    console.log(`   Payment Method: manual_gcash`);
    
    // Since we can't easily test JWT auth in this script, let's verify the route exists
    const fs = require('fs');
    const billingRoutesPath = './routes/billing.js';
    
    if (fs.existsSync(billingRoutesPath)) {
      const routesContent = fs.readFileSync(billingRoutesPath, 'utf8');
      
      if (routesContent.includes('/renew-subscription')) {
        console.log('✅ Renewal route exists in billing.js');
      } else {
        console.log('❌ Renewal route NOT found in billing.js');
      }
      
      if (routesContent.includes('renewActiveSubscription')) {
        console.log('✅ Renewal controller function referenced');
      } else {
        console.log('❌ Renewal controller function NOT referenced');
      }
    }
    
    // Check if controller function exists
    const billingController = require('./controller/billingController');
    if (typeof billingController.renewActiveSubscription === 'function') {
      console.log('✅ Renewal controller function exists');
    } else {
      console.log('❌ Renewal controller function NOT found');
    }
    
    console.log('\n3️⃣ Manual API Test Instructions:');
    console.log('🔧 To test the API endpoint manually:');
    console.log('1. Start your backend server (npm start)');
    console.log('2. Login to get a JWT token');
    console.log('3. Use this curl command:');
    console.log('');
    console.log('curl -X POST http://localhost:5000/api/billing/renew-subscription \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
    console.log('  -d \'{"payment_method": "manual_gcash"}\'');
    console.log('');
    console.log('Expected response: 200 OK with renewal invoice data');
    
    console.log('\n🎉 API Test Setup Complete!');
    
  } catch (error) {
    console.error('💥 API test failed:', error);
  } finally {
    await pool.end();
  }
}

testRenewalAPI();
