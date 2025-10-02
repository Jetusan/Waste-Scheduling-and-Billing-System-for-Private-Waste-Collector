#!/usr/bin/env node

/**
 * Check all tables in the database and their schemas
 */

const pool = require('./config/dbAdmin');

async function checkDatabaseTables() {
  console.log('🔍 CHECKING DATABASE TABLES AND SCHEMAS\n');
  
  try {
    // Get all tables
    const tablesQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    
    console.log(`📊 Found ${tablesResult.rows.length} tables in the database:\n`);
    
    for (const table of tablesResult.rows) {
      console.log(`📋 Table: ${table.table_name} (${table.table_type})`);
      
      // Get columns for each table
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await pool.query(columnsQuery, [table.table_name]);
      
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
      
      console.log(''); // Empty line between tables
    }
    
    // Check specifically for the tables we need for admin registrations
    console.log('🔍 CHECKING REQUIRED TABLES FOR ADMIN REGISTRATIONS:\n');
    
    const requiredTables = ['users', 'user_names', 'addresses', 'barangays', 'cities'];
    
    for (const tableName of requiredTables) {
      const exists = tablesResult.rows.some(row => row.table_name === tableName);
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`${status} ${tableName}`);
      
      if (exists) {
        // Get row count
        try {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`    Records: ${countResult.rows[0].count}`);
        } catch (countError) {
          console.log(`    Records: Error counting (${countError.message})`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    process.exit(0);
  }
}

checkDatabaseTables();
