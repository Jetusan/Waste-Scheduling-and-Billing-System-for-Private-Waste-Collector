// scripts/check_invoices_and_plans.js
const { pool } = require('../config/db');

async function checkTable(tableName) {
  console.log(`\n🔍 Checking "${tableName}" table...\n`);

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
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `;

    const attributes = await pool.query(attributesQuery, [tableName]);

    if (attributes.rows.length > 0) {
      console.log(`✅ ${tableName} Table Attributes:\n`);
      console.table(attributes.rows);
    } else {
      console.log(`⚠️ No attributes found. Table "${tableName}" may not exist.`);
      return;
    }

    // 2️⃣ Check sample data
    const dataQuery = `SELECT * FROM ${tableName} LIMIT 5;`;
    const data = await pool.query(dataQuery);

    console.log(`\n✅ Sample Data from ${tableName}:\n`);
    if (data.rows.length > 0) {
      console.table(data.rows);
    } else {
      console.log(`⚠️ No data found in ${tableName} table.`);
    }

  } catch (error) {
    console.error(`❌ Error checking ${tableName}:`, error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Database check starting...');

    await checkTable('invoices');
    await checkTable('subscription_plans');

    console.log('\n✅ Done checking both tables!');
  } finally {
    await pool.end();
  }
}

main();
