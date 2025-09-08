// scripts/check_payment_sources.js
const { pool } = require('../config/db');

async function checkPaymentSources() {
  console.log('🔍 Checking payment_sources table...\n');

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
      WHERE table_name = 'payment_sources'
      ORDER BY ordinal_position;
    `;

    const attributes = await pool.query(attributesQuery);

    if (attributes.rows.length > 0) {
      console.log('✅ payment_sources Table Attributes:\n');
      console.table(attributes.rows);
    } else {
      console.log('⚠️ No attributes found. Table "payment_sources" may not exist.');
    }

    // 2️⃣ Check sample data
    const dataQuery = `SELECT * FROM payment_sources LIMIT 5;`;
    const data = await pool.query(dataQuery);

    console.log('\n✅ Sample Data from payment_sources:\n');
    if (data.rows.length > 0) {
      console.table(data.rows);
    } else {
      console.log('⚠️ No data found in payment_sources table.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPaymentSources();