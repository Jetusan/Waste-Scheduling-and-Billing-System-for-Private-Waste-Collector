// Test script for subscription renewal functionality
const { pool } = require('./config/db');
const billingModel = require('./models/billingModel');

async function testRenewalFlow() {
  console.log('🧪 Testing Subscription Renewal Flow...\n');
  
  try {
    // Test 1: Check if renewal function exists
    console.log('1️⃣ Testing renewal function existence...');
    if (typeof billingModel.renewActiveSubscription === 'function') {
      console.log('✅ renewActiveSubscription function exists');
    } else {
      console.log('❌ renewActiveSubscription function NOT found');
      return;
    }
    
    // Test 2: Get a test user with active subscription
    console.log('\n2️⃣ Finding test user with active subscription...');
    const activeUserQuery = `
      SELECT cs.user_id, cs.subscription_id, cs.status, u.username
      FROM customer_subscriptions cs
      JOIN users u ON cs.user_id = u.user_id
      WHERE cs.status = 'active'
      LIMIT 1
    `;
    const activeUserResult = await pool.query(activeUserQuery);
    
    if (activeUserResult.rows.length === 0) {
      console.log('❌ No active subscriptions found for testing');
      console.log('💡 Create an active subscription first to test renewal');
      return;
    }
    
    const testUser = activeUserResult.rows[0];
    console.log(`✅ Found test user: ${testUser.username} (ID: ${testUser.user_id})`);
    console.log(`   Subscription ID: ${testUser.subscription_id}`);
    console.log(`   Status: ${testUser.status}`);
    
    // Test 3: Test renewal function with test user
    console.log('\n3️⃣ Testing renewal function...');
    try {
      const renewalResult = await billingModel.renewActiveSubscription(
        testUser.user_id, 
        'manual_gcash'
      );
      
      console.log('✅ Renewal function executed successfully!');
      console.log('📋 Renewal Result:');
      console.log(`   Subscription ID: ${renewalResult.subscription.subscription_id}`);
      console.log(`   Invoice ID: ${renewalResult.invoice.invoice_id}`);
      console.log(`   Invoice Number: ${renewalResult.invoice.invoice_number}`);
      console.log(`   Amount: ₱${renewalResult.invoice.amount}`);
      console.log(`   Due Date: ${renewalResult.invoice.due_date}`);
      console.log(`   Is Existing Renewal: ${renewalResult.isExistingRenewal}`);
      
      // Test 4: Test duplicate renewal (should return existing)
      console.log('\n4️⃣ Testing duplicate renewal prevention...');
      const duplicateResult = await billingModel.renewActiveSubscription(
        testUser.user_id, 
        'manual_gcash'
      );
      
      if (duplicateResult.isExistingRenewal) {
        console.log('✅ Duplicate prevention works - returned existing renewal');
        console.log(`   Same Invoice ID: ${duplicateResult.invoice.invoice_id}`);
      } else {
        console.log('⚠️ Created new renewal instead of returning existing');
      }
      
    } catch (renewalError) {
      console.log('❌ Renewal function failed:');
      console.log(`   Error: ${renewalError.message}`);
      console.log(`   Stack: ${renewalError.stack}`);
    }
    
    // Test 5: Test with non-existent user
    console.log('\n5️⃣ Testing with non-existent user...');
    try {
      await billingModel.renewActiveSubscription(99999, 'manual_gcash');
      console.log('❌ Should have failed for non-existent user');
    } catch (error) {
      if (error.message.includes('No active subscription found')) {
        console.log('✅ Properly handles non-existent user');
      } else {
        console.log(`⚠️ Unexpected error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Renewal Flow Test Complete!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testRenewalFlow();
