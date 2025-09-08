// checkSpecificTables.js
const { pool } = require('../config/db');

async function checkSpecificTablesAndColumns() {
  console.log('🔍 Fetching schema + sample data for selected tables...\n');

  // The specific tables you want to inspect
  const targetTables = ['payment_sources', 'invoices', 'customer_subscriptions'];

  try {
    for (const tableName of targetTables) {
      console.log(`\n📌 Table: ${tableName}`);

      // Fetch columns
      const columnQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position;
      `;

      const columnsResult = await pool.query(columnQuery, [tableName]);

      if (columnsResult.rows.length > 0) {
        console.log('🛠 Columns:');
        console.table(columnsResult.rows);
      } else {
        console.log('⚠️ No columns found for this table.');
      }

      // Fetch sample data (limit 5 rows)
      const dataQuery = `SELECT * FROM ${tableName} LIMIT 5;`;
      try {
        const dataResult = await pool.query(dataQuery);
        if (dataResult.rows.length > 0) {
          console.log('📊 Sample Data:');
          console.table(dataResult.rows);
        } else {
          console.log('⚠️ No data found in this table.');
        }
      } catch (err) {
        console.log(`❌ Could not fetch data from ${tableName}:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching schema/data:', error.message);
  } finally {
    await pool.end();
  }
}

checkSpecificTablesAndColumns();
