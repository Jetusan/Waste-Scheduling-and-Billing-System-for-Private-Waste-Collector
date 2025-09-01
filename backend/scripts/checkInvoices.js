// scripts/check_invoices.js
const { pool } = require('../config/db');

async function checkInvoices() {
  console.log('🔍 Checking invoices table...\n');

  try {
    // 1️⃣ Check table attributes (columns)
    const attributesQuery = `
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

    const attributes = await pool.query(attributesQuery);

    if (attributes.rows.length > 0) {
      console.log('✅ Invoices Table Attributes:\n');
      console.table(attributes.rows);
    } else {
      console.log('⚠️ No attributes found. Table "invoices" may not exist.');
    }

    // 2️⃣ Check sample data
    const dataQuery = `SELECT * FROM invoices LIMIT 5;`;
    const data = await pool.query(dataQuery);

    console.log('\n✅ Sample Data from invoices:\n');
    if (data.rows.length > 0) {
      console.table(data.rows);
    } else {
      console.log('⚠️ No data found in invoices table.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoices();
