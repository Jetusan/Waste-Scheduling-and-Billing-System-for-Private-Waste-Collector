const { Pool } = require('pg');
const pool = require('./config/dbAdmin'); // Adjust path as needed

async function checkTableStructure() {
  const client = await pool.connect();
  try {
    // Get column info for addresses table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'addresses'
      ORDER BY ordinal_position;
    `);
    
    console.log('Addresses table structure:');
    console.table(result.rows);
    
    // Get a sample row
    const sample = await client.query('SELECT * FROM addresses LIMIT 1;');
    console.log('\nSample row:');
    console.log(sample.rows[0] || 'No data found');
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure();