#!/usr/bin/env node

/**
 * Check addresses table schema
 */

const pool = require('./config/dbAdmin');

async function checkAddressesSchema() {
  console.log('🔍 CHECKING ADDRESSES TABLE SCHEMA\n');
  
  try {
    // Check addresses table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'addresses'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(columnsQuery);
    
    console.log('📋 Addresses table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Also check a sample record
    const sampleQuery = `SELECT * FROM addresses LIMIT 1`;
    const sampleResult = await pool.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📄 Sample address record:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAddressesSchema();
