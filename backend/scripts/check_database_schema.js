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

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Connecting to Neon database...');
    
    // Check if password_reset_tokens table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'password_reset_tokens'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ password_reset_tokens table does not exist');
      return;
    }
    
    console.log('✅ password_reset_tokens table exists');
    
    // Check current columns in password_reset_tokens table
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'password_reset_tokens'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current columns in password_reset_tokens table:');
    columnCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if email column exists
    const emailColumn = columnCheck.rows.find(col => col.column_name === 'email');
    if (emailColumn) {
      console.log('\n✅ Email column exists');
    } else {
      console.log('\n❌ Email column is missing - this is the problem!');
    }
    
    // Show all tables in database
    console.log('\n📊 All tables in database:');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    allTables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseSchema();
