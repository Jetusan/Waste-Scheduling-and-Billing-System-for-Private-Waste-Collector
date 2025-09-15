// migrate_subscription_lifecycle.js
const { pool } = require('../config/db');

async function migrateSubscriptionLifecycle() {
  console.log('🚀 Starting Subscription Lifecycle Migration...\n');
  
  try {
    // Check if cancellation_reason column exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customer_subscriptions' 
      AND column_name = 'cancellation_reason';
    `;
    
    const columnExists = await pool.query(checkColumnQuery);
    
    if (columnExists.rows.length === 0) {
      console.log('📝 Adding missing cancellation_reason column...');
      
      const addColumnQuery = `
        ALTER TABLE customer_subscriptions 
        ADD COLUMN cancellation_reason TEXT;
      `;
      
      await pool.query(addColumnQuery);
      console.log('✅ Successfully added cancellation_reason column');
    } else {
      console.log('✅ cancellation_reason column already exists');
    }
    
    // Verify all lifecycle columns are present
    console.log('\n🔍 Verifying all lifecycle columns...');
    
    const verifyQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customer_subscriptions' 
      AND column_name IN (
        'payment_status', 'payment_confirmed_at', 'subscription_created_at',
        'last_payment_date', 'next_billing_date', 'grace_period_end',
        'suspended_at', 'cancelled_at', 'cancellation_reason',
        'reactivated_at', 'billing_cycle_count'
      )
      ORDER BY column_name;
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    const presentColumns = verifyResult.rows.map(row => row.column_name);
    
    const requiredColumns = [
      'payment_status', 'payment_confirmed_at', 'subscription_created_at',
      'last_payment_date', 'next_billing_date', 'grace_period_end',
      'suspended_at', 'cancelled_at', 'cancellation_reason',
      'reactivated_at', 'billing_cycle_count'
    ];
    
    console.log('\n📋 Lifecycle Columns Status:');
    requiredColumns.forEach(col => {
      const status = presentColumns.includes(col) ? '✅' : '❌';
      console.log(`   ${status} ${col}`);
    });
    
    const missingColumns = requiredColumns.filter(col => !presentColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('\n🎉 ALL LIFECYCLE COLUMNS ARE PRESENT!');
      console.log('✅ Database is ready for subscription lifecycle implementation');
      
      // Update existing subscriptions with default values if needed
      console.log('\n🔄 Updating existing subscriptions with default values...');
      
      const updateQuery = `
        UPDATE customer_subscriptions 
        SET 
          payment_status = COALESCE(payment_status, 'pending'),
          billing_cycle_count = COALESCE(billing_cycle_count, 0),
          subscription_created_at = COALESCE(subscription_created_at, created_at)
        WHERE payment_status IS NULL 
           OR billing_cycle_count IS NULL 
           OR subscription_created_at IS NULL;
      `;
      
      const updateResult = await pool.query(updateQuery);
      console.log(`✅ Updated ${updateResult.rowCount} existing subscription records`);
      
    } else {
      console.log('\n❌ Missing columns found. Manual intervention required.');
      missingColumns.forEach(col => console.log(`   ❌ ${col}`));
    }
    
    console.log('\n🎯 MIGRATION COMPLETE!');
    console.log('Next steps:');
    console.log('   1. ✅ Database schema is ready');
    console.log('   2. 🔄 Set up cron job scheduling');
    console.log('   3. 🧪 Test API endpoints');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

migrateSubscriptionLifecycle();
