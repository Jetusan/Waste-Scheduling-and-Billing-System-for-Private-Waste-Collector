const { Pool } = require('pg');

// Direct connection to Neon database
const neonPool = new Pool({
  host: 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugPaymentMethods() {
  try {
    console.log('🔍 Debugging payment methods in Neon database...\n');
    
    // Check customer_subscriptions table structure
    console.log('📋 customer_subscriptions table structure:');
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customer_subscriptions' 
      ORDER BY ordinal_position
    `;
    const structureResult = await neonPool.query(structureQuery);
    structureResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check all subscriptions with payment methods
    console.log('\n💳 All customer subscriptions with payment methods:');
    const subscriptionsQuery = `
      SELECT cs.subscription_id, cs.user_id, cs.payment_method, cs.status, cs.payment_status,
             u.username, sp.plan_name, sp.price
      FROM customer_subscriptions cs
      LEFT JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE u.role_id = 3 AND u.approval_status = 'approved'
      ORDER BY cs.user_id, cs.created_at DESC
    `;
    
    const subscriptionsResult = await neonPool.query(subscriptionsQuery);
    console.log(`Found ${subscriptionsResult.rows.length} subscriptions:`);
    
    subscriptionsResult.rows.forEach((sub, index) => {
      console.log(`\n   ${index + 1}. Subscription ID: ${sub.subscription_id}`);
      console.log(`      User: ${sub.username} (ID: ${sub.user_id})`);
      console.log(`      Payment Method: "${sub.payment_method}" (${typeof sub.payment_method})`);
      console.log(`      Status: ${sub.status}`);
      console.log(`      Payment Status: ${sub.payment_status}`);
      console.log(`      Plan: ${sub.plan_name} - ₱${sub.price}`);
    });
    
    // Check for NULL or unexpected payment methods
    console.log('\n⚠️ Subscriptions with NULL or unexpected payment methods:');
    const nullPaymentQuery = `
      SELECT cs.subscription_id, cs.user_id, cs.payment_method, u.username
      FROM customer_subscriptions cs
      LEFT JOIN users u ON cs.user_id = u.user_id
      WHERE u.role_id = 3 AND u.approval_status = 'approved'
        AND (cs.payment_method IS NULL OR cs.payment_method NOT IN ('gcash', 'cash'))
      ORDER BY cs.user_id
    `;
    
    const nullPaymentResult = await neonPool.query(nullPaymentQuery);
    if (nullPaymentResult.rows.length > 0) {
      console.log(`Found ${nullPaymentResult.rows.length} subscriptions with issues:`);
      nullPaymentResult.rows.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.username} (ID: ${sub.user_id}): payment_method = "${sub.payment_method}"`);
      });
    } else {
      console.log('   ✅ All subscriptions have valid payment methods (gcash or cash)');
    }
    
    // Test the exact API query that the mobile app uses
    console.log('\n🧪 Testing the exact API query used by mobile app:');
    const testUserIds = subscriptionsResult.rows.slice(0, 5).map(s => s.user_id);
    console.log(`   Testing with user IDs: [${testUserIds.join(', ')}]`);
    
    const apiQuery = `
      SELECT DISTINCT ON (cs.user_id)
        cs.user_id,
        cs.subscription_id,
        cs.payment_method,
        cs.status,
        cs.payment_status,
        cs.payment_confirmed_at,
        sp.plan_name,
        sp.price,
        sp.frequency
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = ANY($1::int[])
      ORDER BY cs.user_id, cs.created_at DESC
    `;
    
    const apiResult = await neonPool.query(apiQuery, [testUserIds]);
    console.log(`   API query returned ${apiResult.rows.length} results:`);
    
    apiResult.rows.forEach((row, index) => {
      console.log(`\n   ${index + 1}. User ID: ${row.user_id}`);
      console.log(`      Payment Method: "${row.payment_method}"`);
      console.log(`      Status: ${row.status}`);
      console.log(`      Plan: ${row.plan_name} - ₱${row.price}`);
    });
    
    // Check if there are any residents without subscriptions
    console.log('\n❌ Approved residents WITHOUT subscriptions:');
    const noSubQuery = `
      SELECT u.user_id, u.username
      FROM users u
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      WHERE u.role_id = 3 AND u.approval_status = 'approved'
        AND cs.user_id IS NULL
      ORDER BY u.user_id
    `;
    
    const noSubResult = await neonPool.query(noSubQuery);
    if (noSubResult.rows.length > 0) {
      console.log(`   Found ${noSubResult.rows.length} residents without subscriptions:`);
      noSubResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (ID: ${user.user_id})`);
      });
    } else {
      console.log('   ✅ All approved residents have subscriptions');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total subscriptions: ${subscriptionsResult.rows.length}`);
    console.log(`   With NULL/invalid payment methods: ${nullPaymentResult.rows.length}`);
    console.log(`   Residents without subscriptions: ${noSubResult.rows.length}`);
    
    if (nullPaymentResult.rows.length > 0) {
      console.log('\n🔧 RECOMMENDED FIX:');
      console.log('   Update NULL payment methods to default values:');
      console.log('   UPDATE customer_subscriptions SET payment_method = \'cash\' WHERE payment_method IS NULL;');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await neonPool.end();
    process.exit(0);
  }
}

debugPaymentMethods();
