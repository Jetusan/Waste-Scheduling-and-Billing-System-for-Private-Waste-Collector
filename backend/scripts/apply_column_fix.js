const { query } = require('../config/db');
const fs = require('fs');

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing service_start and service_end columns to invoices table...');
    
    const sql = fs.readFileSync('./add_missing_columns.sql', 'utf8');
    const result = await query(sql);
    
    console.log('✅ Columns added successfully!');
    
    // Show the verification results
    if (result.rows && result.rows.length > 0) {
      console.log('\n📋 Verified columns in invoices table:');
      result.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    console.log('\n🎉 Payment confirmation should now work without errors!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding columns:', err.message);
    process.exit(1);
  }
}

addMissingColumns();
