const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'waste_collection_db',
  password: 'root',
  port: 5432,
});

async function setupChatTables() {
  try {
    console.log('Setting up chat tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_chat_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Chat tables created successfully!');
    
    // Test the tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'special_pickup_chat%'
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up chat tables:', error.message);
  } finally {
    await pool.end();
  }
}

setupChatTables();
