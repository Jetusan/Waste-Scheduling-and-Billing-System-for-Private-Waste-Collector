const { pool } = require('../config/db');

async function checkPayments() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      ORDER BY ordinal_position
    `);
    
    console.log('PAYMENTS table columns:');
    result.rows.forEach(col => {
      console.log(`• ${col.column_name} - ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPayments();
