const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function checkTrucksSchema() {
  try {
    console.log('🚛 Checking trucks table schema...');
    
    // Check if trucks table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'trucks'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ trucks table does not exist');
      return;
    }
    
    console.log('✅ trucks table exists');
    
    // Check current columns in trucks table
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'trucks'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current columns in trucks table:');
    columnCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Show sample data
    const sampleData = await pool.query('SELECT * FROM trucks LIMIT 3');
    console.log('\n📊 Sample truck data:');
    sampleData.rows.forEach((truck, index) => {
      console.log(`  ${index + 1}.`, truck);
    });
    
  } catch (error) {
    console.error('❌ Error checking trucks schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkTrucksSchema();
