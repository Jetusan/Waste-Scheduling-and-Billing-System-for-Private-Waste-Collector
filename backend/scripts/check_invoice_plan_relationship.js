// checkInvoiceAttributes.js
const { pool } = require('../config/db');

async function checkInvoiceAttributes() {
  console.log('🔍 Checking attributes of invoices table...\n');

  try {
    // Query all column details of invoices table
    const query = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position;
    `;

    const result = await pool.query(query);

    if (result.rows.length > 0) {
      console.log('✅ Invoices Table Attributes:\n');
      console.table(result.rows);
    } else {
      console.log('⚠️ No attributes found. Table "invoices" may not exist.');
    }

  } catch (error) {
    console.error('❌ Error checking invoices attributes:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoiceAttributes();
