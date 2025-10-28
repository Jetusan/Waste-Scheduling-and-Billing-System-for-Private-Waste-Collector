const { pool } = require('../config/db');

async function checkInvoices() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND character_maximum_length = 20
    `);
    
    console.log('VARCHAR(20) columns in invoices table:');
    result.rows.forEach(col => {
      console.log(`• ${col.column_name} - ${col.data_type}(${col.character_maximum_length})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoices();
