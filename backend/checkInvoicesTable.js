#!/usr/bin/env node

const pool = require('./config/db');

async function checkInvoicesTable() {
  try {
    console.log('🔍 Checking invoices table structure...\n');

    // Get table schema
    const schemaResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);

    console.log('📋 INVOICES TABLE SCHEMA:');
    console.log('='.repeat(80));
    console.log('Column Name'.padEnd(25) + 'Data Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Default');
    console.log('-'.repeat(80));

    schemaResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'YES' : 'NO';
      const defaultVal = row.column_default || 'NULL';
      console.log(
        row.column_name.padEnd(25) + 
        row.data_type.padEnd(20) + 
        nullable.padEnd(10) + 
        defaultVal
      );
    });

    // Check constraints
    console.log('\n🔒 TABLE CONSTRAINTS:');
    console.log('='.repeat(50));
    
    const constraintsResult = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'invoices'
      ORDER BY tc.constraint_type, kcu.column_name
    `);

    constraintsResult.rows.forEach(row => {
      console.log(`${row.constraint_type}: ${row.column_name} (${row.constraint_name})`);
    });

    // Sample existing data
    console.log('\n📊 SAMPLE EXISTING DATA (First 3 rows):');
    console.log('='.repeat(50));
    
    const sampleResult = await pool.query(`
      SELECT * FROM invoices 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    if (sampleResult.rows.length > 0) {
      // Show column names
      const columns = Object.keys(sampleResult.rows[0]);
      console.log('Columns:', columns.join(', '));
      console.log('-'.repeat(50));
      
      sampleResult.rows.forEach((row, index) => {
        console.log(`Row ${index + 1}:`);
        columns.forEach(col => {
          console.log(`  ${col}: ${row[col]}`);
        });
        console.log('');
      });
    } else {
      console.log('No existing data found.');
    }

    // Check NOT NULL columns specifically
    console.log('\n❗ REQUIRED (NOT NULL) COLUMNS:');
    console.log('='.repeat(40));
    
    const requiredColumns = schemaResult.rows.filter(row => row.is_nullable === 'NO');
    requiredColumns.forEach(row => {
      const hasDefault = row.column_default !== null;
      console.log(`• ${row.column_name} (${row.data_type})${hasDefault ? ' - HAS DEFAULT' : ' - MUST PROVIDE'}`);
    });

    console.log('\n✅ Table analysis complete!');

  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

checkInvoicesTable();
