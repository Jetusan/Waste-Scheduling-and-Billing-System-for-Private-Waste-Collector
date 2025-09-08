const { pool } = require('../config/db');

const checkUserTableStructure = async () => {
  try {
    console.log('🔍 Checking users table structure...\n');
    
    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    
    const structure = await pool.query(structureQuery);
    console.log('📋 USERS TABLE COLUMNS:');
    console.table(structure.rows);
    
    // Get sample data
    const sampleQuery = 'SELECT * FROM users LIMIT 3';
    const sample = await pool.query(sampleQuery);
    console.log('\n📊 SAMPLE USER DATA:');
    console.table(sample.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkUserTableStructure();
