const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixInvoicesTable() {
  try {
    const sql = fs.readFileSync('./fix_invoices_table.sql', 'utf8');
    const result = await pool.query(sql);
    
    console.log('✅ Invoices table fixed successfully!');
    console.log('Columns added: service_start, service_end');
    
    // Verify columns exist
    const checkResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name IN ('service_start', 'service_end')
      ORDER BY column_name
    `);
    
    console.log('Verified columns:');
    checkResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing invoices table:', err.message);
    process.exit(1);
  }
}

fixInvoicesTable();
