// checkAllTables.js
const { pool } = require('../config/db');

async function checkAllTablesAndColumns() {
  console.log('🔍 Fetching all tables and their columns in the current database...\n');

  try {
    // Fetch all user tables
    const tableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const tablesResult = await pool.query(tableQuery);

    if (tablesResult.rows.length > 0) {
      for (const { table_name } of tablesResult.rows) {
        console.log(`\n📌 Table: ${table_name}`);

        // Fetch columns for each table
        const columnQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `;

        const columnsResult = await pool.query(columnQuery, [table_name]);

        if (columnsResult.rows.length > 0) {
          console.table(columnsResult.rows);
        } else {
          console.log('⚠️ No columns found for this table.');
        }
      }
    } else {
      console.log('⚠️ No tables found in this database.');
    }

  } catch (error) {
    console.error('❌ Error fetching tables/columns:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllTablesAndColumns();
