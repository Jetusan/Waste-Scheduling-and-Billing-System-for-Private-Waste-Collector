// checkInvoicesData.js
const { pool } = require('../config/db');

async function checkInvoicesData() {
  console.log('🔍 Fetching data from invoices table...\n');

  try {
    const query = `
      SELECT * 
      FROM invoices
      LIMIT 20; -- limit so you don’t dump too many rows
    `;

    const result = await pool.query(query);

    if (result.rows.length > 0) {
      console.log('✅ Invoices Table Data:\n');
      console.table(result.rows);
    } else {
      console.log('⚠️ No data found in "invoices".');
    }

  } catch (error) {
    console.error('❌ Error fetching invoices data:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoicesData();
