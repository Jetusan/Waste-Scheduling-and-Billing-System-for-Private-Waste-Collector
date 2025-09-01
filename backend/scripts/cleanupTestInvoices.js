const { pool } = require('../config/db');

async function cleanupTestInvoices() {
  try {
    console.log('🧹 Cleaning up test invoices...');
    
    // Delete unpaid invoices created today for testing
    const deleteQuery = `
      DELETE FROM invoices 
      WHERE status = 'unpaid' 
      AND DATE(created_at) = CURRENT_DATE
      AND notes LIKE '%Initial invoice%'
    `;
    
    const result = await pool.query(deleteQuery);
    console.log(`✅ Deleted ${result.rowCount} test invoices`);
    
    // Show remaining invoices
    const remainingQuery = `
      SELECT invoice_id, invoice_number, user_id, amount, status, created_at
      FROM invoices 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const remaining = await pool.query(remainingQuery);
    console.log('\n📋 Remaining invoices:');
    console.table(remaining.rows);
    
  } catch (error) {
    console.error('❌ Error cleaning up invoices:', error);
  } finally {
    pool.end();
  }
}

cleanupTestInvoices();
