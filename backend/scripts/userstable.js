const { pool } = require('../config/db');

async function checkUsersTable() {
  try {
    console.log('🔍 Checking "users" Table Structure...');
    console.log('=====================================');

    // Test DB connection
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Connected to database at: ${connectionTest.rows[0].current_time}`);
    console.log('');

    const tableName = 'users';

    // Check if "users" table exists
    const tableExistsQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    `;
    const tableCheck = await pool.query(tableExistsQuery, [tableName]);

    if (tableCheck.rows.length === 0) {
      console.log(`❌ Table "${tableName}" not found in the database.`);
      return;
    }

    console.log(`📊 Found table: "${tableName}"`);
    console.log('');

    // Get column details
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    const columns = await pool.query(columnsQuery, [tableName]);

    console.log(`🔹 Structure of ${tableName.toUpperCase()}`);
    console.log('─'.repeat(40));
    columns.rows.forEach((col, index) => {
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT: ${col.column_default}` : '';

      console.log(`   ${index + 1}. ${col.column_name}`);
      console.log(`      Type: ${col.data_type}${maxLength}`);
      console.log(`      Nullable: ${nullable}${defaultValue}`);
      console.log('');
    });

    // Get row count
    try {
      const countQuery = `SELECT COUNT(*) as row_count FROM "${tableName}"`;
      const countResult = await pool.query(countQuery);
      console.log(`📈 Total rows in "${tableName}": ${countResult.rows[0].row_count}`);
    } catch (err) {
      console.log(`⚠️ Could not get row count: ${err.message}`);
    }

    console.log('');
    console.log('═'.repeat(50));
    console.log('');

  } catch (error) {
    console.error('❌ Error checking users table:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure PostgreSQL is running and connection details are correct.');
    }
  } finally {
    await pool.end();
    console.log('');
    console.log('🔚 Database connection closed.');
  }
}

// Run the function
console.log('🚀 Starting users table check...');
checkUsersTable();
