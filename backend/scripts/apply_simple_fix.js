const { query } = require('../config/db');
const fs = require('fs');

async function applySimpleFix() {
  try {
    const sql = fs.readFileSync('./simple_payment_fix.sql', 'utf8');
    await query(sql);
    console.log('✅ Payment fix applied successfully!');
    
    // Verify columns exist
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name IN ('service_start', 'service_end')
    `);
    
    console.log(`✅ Verified ${result.rows.length} columns exist in invoices table`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applySimpleFix();
