// check_invoices_schema.js - Quick check of invoices table schema
const { pool } = require('../config/db');

async function checkInvoicesSchema() {
  try {
    const query = `
      SELECT column_name, is_nullable, column_default, data_type
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(query);
    console.log('📋 Invoices Table Schema:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoicesSchema();
