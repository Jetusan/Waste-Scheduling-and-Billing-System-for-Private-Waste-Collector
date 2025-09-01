const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runSchemaUpdate() {
  try {
    console.log('🔄 Running subscription schema updates...');
    
    // Execute schema updates step by step with error handling
    const updates = [
      {
        name: 'Add payment_status column',
        sql: `ALTER TABLE customer_subscriptions 
              ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' 
              CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))`
      },
      {
        name: 'Update existing subscriptions payment_status',
        sql: `UPDATE customer_subscriptions 
              SET payment_status = 'paid' 
              WHERE status = 'active' AND (payment_status IS NULL OR payment_status = 'pending')`
      },
      {
        name: 'Update default status for new subscriptions',
        sql: `ALTER TABLE customer_subscriptions 
              ALTER COLUMN status SET DEFAULT 'pending_payment'`
      },
      {
        name: 'Add payment_status index',
        sql: `CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_payment_status 
              ON customer_subscriptions(payment_status)`
      },
      {
        name: 'Add subscription_created_at column',
        sql: `ALTER TABLE customer_subscriptions 
              ADD COLUMN IF NOT EXISTS subscription_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      },
      {
        name: 'Update existing records creation timestamp',
        sql: `UPDATE customer_subscriptions 
              SET subscription_created_at = created_at 
              WHERE subscription_created_at IS NULL`
      },
      {
        name: 'Add payment_confirmed_at column',
        sql: `ALTER TABLE customer_subscriptions 
              ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP`
      },
      {
        name: 'Update existing active subscriptions payment confirmation',
        sql: `UPDATE customer_subscriptions 
              SET payment_confirmed_at = created_at 
              WHERE status = 'active' AND payment_confirmed_at IS NULL`
      }
    ];
    
    // Execute each update
    for (const update of updates) {
      try {
        console.log(`🔄 ${update.name}...`);
        await pool.query(update.sql);
        console.log(`✅ ${update.name} completed`);
      } catch (error) {
        console.error(`❌ Error in ${update.name}:`, error.message);
        // Continue with other updates even if one fails
      }
    }
    
    console.log('✅ Schema update process completed!');
    
    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'customer_subscriptions' 
      AND column_name IN ('payment_status', 'subscription_created_at', 'payment_confirmed_at')
      ORDER BY column_name
    `);
    
    console.log('📋 Current subscription table columns:', result.rows);
    
  } catch (error) {
    console.error('❌ Error running schema update:', error);
  } finally {
    await pool.end();
  }
}

runSchemaUpdate();
