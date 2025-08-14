const { pool } = require('../config/db');

async function checkDatabase() {
  try {
    console.log('🔍 Checking Database Structure...');
    console.log('=====================================');
    
    // Check connection
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Connected to database at: ${connectionTest.rows[0].current_time}`);
    console.log('');
    
    // Get all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tables = await pool.query(tablesQuery);
    
    if (tables.rows.length === 0) {
      console.log('❌ No tables found in the database.');
      return;
    }
    
    console.log(`📊 Found ${tables.rows.length} table(s) in the database:`);
    console.log('');
    
    // Check each table structure
    for (const table of tables.rows) {
      console.log(`🔹 Table: ${table.table_name.toUpperCase()}`);
      console.log('─'.repeat(40));
      
      // Get columns for each table
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
      
      const columns = await pool.query(columnsQuery, [table.table_name]);
      
      // Display column information
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
        const countQuery = `SELECT COUNT(*) as row_count FROM "${table.table_name}"`;
        const countResult = await pool.query(countQuery);
        console.log(`   📈 Total rows: ${countResult.rows[0].row_count}`);
      } catch (err) {
        console.log(`   ⚠️  Could not get row count: ${err.message}`);
      }
      
      console.log('');
      console.log('═'.repeat(50));
      console.log('');
    }
    
    // Get database size information
    try {
      const dbSizeQuery = `
        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
      `;
      const sizeResult = await pool.query(dbSizeQuery);
      console.log(`💾 Database size: ${sizeResult.rows[0].db_size}`);
    } catch (err) {
      console.log('⚠️  Could not get database size');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
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
console.log('🚀 Starting database check...');
checkDatabase();
