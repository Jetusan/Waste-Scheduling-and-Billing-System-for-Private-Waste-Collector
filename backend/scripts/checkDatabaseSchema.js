const { pool } = require('../config/db');

/**
 * Check Database Schema - Examine all tables and their columns
 * This will help us understand the exact structure before populating data
 */

async function checkDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 WSBS Database Schema Analysis');
    console.log('================================');
    
    // Get all tables in the database
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows;
    
    console.log(`📊 Found ${tables.length} tables in the database:\n`);
    
    // For each table, get its columns
    for (const table of tables) {
      const tableName = table.table_name;
      
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows;
      
      console.log(`📋 Table: ${tableName.toUpperCase()}`);
      console.log(`   Columns (${columns.length}):`);
      
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`   • ${col.column_name} - ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
      });
      
      console.log(''); // Empty line for readability
    }
    
    // Check for key tables we need for population
    const keyTables = [
      'users', 'user_names', 'addresses', 'barangays', 
      'customer_subscriptions', 'subscription_plans', 
      'invoices', 'payments', 'collection_stop_events',
      'special_pickup_requests', 'collectors'
    ];
    
    console.log('🔑 Key Tables Analysis:');
    console.log('======================');
    
    for (const keyTable of keyTables) {
      const exists = tables.find(t => t.table_name === keyTable);
      if (exists) {
        console.log(`✅ ${keyTable} - EXISTS`);
      } else {
        console.log(`❌ ${keyTable} - MISSING`);
      }
    }
    
    // Check if there are any existing subscription plans
    try {
      const plansResult = await client.query('SELECT plan_id, plan_name, price FROM subscription_plans LIMIT 5');
      console.log(`\n📦 Subscription Plans (${plansResult.rows.length} found):`);
      plansResult.rows.forEach(plan => {
        console.log(`   • ${plan.plan_name} - ₱${plan.price} (ID: ${plan.plan_id})`);
      });
    } catch (error) {
      console.log('\n❌ Could not check subscription plans:', error.message);
    }
    
    // Check if there are any existing users
    try {
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n👥 Existing Users: ${usersResult.rows[0].count}`);
    } catch (error) {
      console.log('\n❌ Could not check users:', error.message);
    }
    
    // Check if there are any existing barangays
    try {
      const barangaysResult = await client.query('SELECT * FROM barangays LIMIT 3');
      console.log(`\n🏘️ Existing Barangays (${barangaysResult.rows.length} shown):`);
      barangaysResult.rows.forEach(barangay => {
        console.log(`   • ${JSON.stringify(barangay)}`);
      });
    } catch (error) {
      console.log('\n❌ Could not check barangays:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  } finally {
    client.release();
  }
}

// Run the schema check
if (require.main === module) {
  checkDatabaseSchema()
    .then(() => {
      console.log('\n✅ Database schema analysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Schema analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseSchema };
