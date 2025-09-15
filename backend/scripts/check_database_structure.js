// check_database_structure.js - Quick check of actual database structure
const { pool } = require('../config/db');

async function checkDatabaseStructure() {
  try {
    // Get all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tables = await pool.query(tablesQuery);
    console.log('📋 Available Tables:');
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Check customer_subscriptions structure
    console.log('\n📊 customer_subscriptions columns:');
    const subsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customer_subscriptions' 
      ORDER BY ordinal_position
    `;
    const subsCols = await pool.query(subsQuery);
    subsCols.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'nullable' : 'required'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseStructure();
