const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'waste_collection_db',
  password: 'root',
  port: 5432,
});

async function verifyBillingTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying billing tables in waste_collection_db...\n');
    
    // Check if tables exist
    const tables = [
      'subscription_plans',
      'customer_subscriptions', 
      'invoices',
      'payments',
      'payment_history'
    ];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✅ Table '${table}' exists`);
        
        // Count rows in the table
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   📊 Rows: ${countResult.rows[0].count}`);
        
        // Show table structure
        const structureResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [table]);
        
        console.log(`   📋 Columns:`);
        structureResult.rows.forEach(col => {
          console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
        console.log('');
      } else {
        console.log(`❌ Table '${table}' does NOT exist`);
      }
    }
    
    // Check for default subscription plans
    console.log('📋 Checking default subscription plans...');
    const plansResult = await client.query('SELECT * FROM subscription_plans');
    console.log(`   Found ${plansResult.rows.length} subscription plans:`);
    plansResult.rows.forEach(plan => {
      console.log(`   - ${plan.plan_name}: ₱${plan.price} (${plan.frequency})`);
    });
    
    // Check for indexes
    console.log('\n🔍 Checking indexes...');
    const indexesResult = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('subscription_plans', 'customer_subscriptions', 'invoices', 'payments', 'payment_history')
      ORDER BY tablename, indexname;
    `);
    
    console.log(`   Found ${indexesResult.rows.length} indexes:`);
    indexesResult.rows.forEach(index => {
      console.log(`   - ${index.indexname} on ${index.tablename}`);
    });
    
    console.log('\n🎉 Verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Error verifying billing tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyBillingTables()
    .then(() => {
      console.log('✅ All billing tables are properly set up!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyBillingTables }; 