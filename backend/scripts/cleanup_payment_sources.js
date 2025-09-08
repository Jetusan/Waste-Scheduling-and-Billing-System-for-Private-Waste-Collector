// scripts/cleanup_payment_sources.js
const { pool } = require('../config/db');

async function cleanupPaymentSources() {
  console.log('🧹 Cleaning up payment_sources table...\n');

  try {
    // Count how many rows will be deleted
    const countQuery = `SELECT COUNT(*) FROM payment_sources WHERE invoice_id IS NULL;`;
    const countResult = await pool.query(countQuery);
    const rowsToDelete = countResult.rows[0].count;

    if (rowsToDelete > 0) {
      console.log(`⚠️ Found ${rowsToDelete} rows with invoice_id = NULL. Deleting...`);

      const deleteQuery = `DELETE FROM payment_sources WHERE invoice_id IS NULL RETURNING *;`;
      const deletedRows = await pool.query(deleteQuery);

      console.log(`✅ Deleted ${deletedRows.rowCount} rows successfully!\n`);
      console.table(deletedRows.rows); // Show which rows were deleted
    } else {
      console.log('✅ No rows with invoice_id = NULL found. Nothing to delete.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupPaymentSources();
