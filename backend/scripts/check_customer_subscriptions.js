const { Pool } = require('pg');
const config = require('../config/config');

const pool = new Pool(config.db);

async function checkCustomerSubscriptionsTable() {
  try {
    console.log('🔍 Checking customer_subscriptions table structure...\n');
    
    // Get table structure
    const query = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'customer_subscriptions' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ customer_subscriptions table not found!');
      return;
    }
    
    console.log('✅ customer_subscriptions table structure:');
    console.log('─'.repeat(80));
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable.padEnd(8)} | ${row.column_default || 'NULL'}`);
    });
    console.log('─'.repeat(80));
    
    // Check for new lifecycle columns
    const lifecycleColumns = [
      'payment_status', 'payment_confirmed_at', 'subscription_created_at',
      'last_payment_date', 'next_billing_date', 'grace_period_end',
      'suspended_at', 'cancelled_at', 'cancellation_reason',
      'reactivated_at', 'billing_cycle_count'
    ];
    
    const existingColumns = result.rows.map(row => row.column_name);
    const missingColumns = lifecycleColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing lifecycle columns:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✅ All lifecycle columns are present!');
    }
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
  } finally {
    await pool.end();
  }
}

checkCustomerSubscriptionsTable();
