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

async function fixPaymentMethods() {
  try {
    console.log('🔧 Fixing payment methods in Neon database...\n');
    
    // Show current payment methods before fixing
    console.log('📊 Current payment methods:');
    const beforeQuery = `
      SELECT payment_method, COUNT(*) as count
      FROM customer_subscriptions
      GROUP BY payment_method
      ORDER BY count DESC
    `;
    const beforeResult = await neonPool.query(beforeQuery);
    beforeResult.rows.forEach(row => {
      console.log(`   - "${row.payment_method}": ${row.count} subscriptions`);
    });
    
    console.log('\n🔄 Applying fixes...');
    
    // Fix 1: Convert "manual_gcash" to "gcash"
    const fix1Query = `
      UPDATE customer_subscriptions 
      SET payment_method = 'gcash' 
      WHERE payment_method = 'manual_gcash'
    `;
    const fix1Result = await neonPool.query(fix1Query);
    console.log(`✅ Fixed ${fix1Result.rowCount} "manual_gcash" → "gcash"`);
    
    // Fix 2: Convert "GCash" to "gcash" (uppercase to lowercase)
    const fix2Query = `
      UPDATE customer_subscriptions 
      SET payment_method = 'gcash' 
      WHERE payment_method = 'GCash'
    `;
    const fix2Result = await neonPool.query(fix2Query);
    console.log(`✅ Fixed ${fix2Result.rowCount} "GCash" → "gcash"`);
    
    // Fix 3: Convert "Cash" to "cash" (uppercase to lowercase)
    const fix3Query = `
      UPDATE customer_subscriptions 
      SET payment_method = 'cash' 
      WHERE payment_method = 'Cash'
    `;
    const fix3Result = await neonPool.query(fix3Query);
    console.log(`✅ Fixed ${fix3Result.rowCount} "Cash" → "cash"`);
    
    // Fix 4: Convert NULL to "cash" (default payment method)
    const fix4Query = `
      UPDATE customer_subscriptions 
      SET payment_method = 'cash' 
      WHERE payment_method IS NULL
    `;
    const fix4Result = await neonPool.query(fix4Query);
    console.log(`✅ Fixed ${fix4Result.rowCount} NULL → "cash"`);
    
    // Fix 5: Handle any other unexpected values
    const fix5Query = `
      UPDATE customer_subscriptions 
      SET payment_method = 'cash' 
      WHERE payment_method NOT IN ('gcash', 'cash')
    `;
    const fix5Result = await neonPool.query(fix5Query);
    console.log(`✅ Fixed ${fix5Result.rowCount} other values → "cash"`);
    
    // Show updated payment methods after fixing
    console.log('\n📊 Updated payment methods:');
    const afterQuery = `
      SELECT payment_method, COUNT(*) as count
      FROM customer_subscriptions
      GROUP BY payment_method
      ORDER BY count DESC
    `;
    const afterResult = await neonPool.query(afterQuery);
    afterResult.rows.forEach(row => {
      console.log(`   - "${row.payment_method}": ${row.count} subscriptions`);
    });
    
    // Verify all payment methods are now valid
    console.log('\n🔍 Verification - checking for invalid payment methods:');
    const verifyQuery = `
      SELECT payment_method, COUNT(*) as count
      FROM customer_subscriptions
      WHERE payment_method NOT IN ('gcash', 'cash')
      GROUP BY payment_method
    `;
    const verifyResult = await neonPool.query(verifyQuery);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ All payment methods are now valid (gcash or cash)!');
    } else {
      console.log('❌ Still have invalid payment methods:');
      verifyResult.rows.forEach(row => {
        console.log(`   - "${row.payment_method}": ${row.count} subscriptions`);
      });
    }
    
    // Show sample of fixed subscriptions
    console.log('\n📋 Sample of fixed subscriptions:');
    const sampleQuery = `
      SELECT cs.user_id, u.username, cs.payment_method, cs.status
      FROM customer_subscriptions cs
      LEFT JOIN users u ON cs.user_id = u.user_id
      WHERE u.role_id = 3 AND u.approval_status = 'approved'
      ORDER BY cs.user_id
      LIMIT 10
    `;
    const sampleResult = await neonPool.query(sampleQuery);
    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.username} (ID: ${row.user_id}): "${row.payment_method}" (${row.status})`);
    });
    
    console.log('\n🎉 Payment method fix completed!');
    console.log('📱 The collector app should now show proper payment methods instead of "Unknown"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await neonPool.end();
    process.exit(0);
  }
}

fixPaymentMethods();
