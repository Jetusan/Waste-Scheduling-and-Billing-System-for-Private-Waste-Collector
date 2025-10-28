// backend/scripts/check_invoices_columns.js
const { query } = require('../config/db');

async function checkInvoicesColumns() {
  try {
    console.log('🔍 Checking invoices table columns...\n');

    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  No columns found. Is the invoices table missing?');
    } else {
      result.rows.forEach((row) => {
        console.log(
          `- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`
        );
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking invoices table:', err.message);
    process.exit(1);
  }
}

checkInvoicesColumns();