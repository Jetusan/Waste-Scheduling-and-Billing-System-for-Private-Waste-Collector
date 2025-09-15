// checkAllTables.js
const { pool } = require('../config/db');

async function checkAllTables() {
  console.log('🔍 Fetching all tables in the current database...\n');

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
      console.log('📋 List of tables:');
      console.log('==================');
      
      tablesResult.rows.forEach(({ table_name }, index) => {
        console.log(`${index + 1}. ${table_name}`);
      });
      
      console.log(`\n✅ Total tables found: ${tablesResult.rows.length}`);
    } else {
      console.log('⚠️ No tables found in this database.');
    }

  } catch (error) {
    console.error('❌ Error fetching tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllTables();