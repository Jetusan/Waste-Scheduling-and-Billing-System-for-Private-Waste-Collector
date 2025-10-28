const { pool } = require('../config/db');

async function checkInvoiceStructure() {
  try {
    console.log('🔍 CHECKING INVOICE STRUCTURE AND LINKAGE');
    console.log('==========================================');
    
    // Check invoice table structure
    const columnsResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    
    console.log('INVOICES table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`   • ${col.column_name}`);
    });
    
    // Check a sample invoice to see the structure
    const sampleInvoice = await pool.query(`
      SELECT i.*, cs.user_id 
      FROM invoices i 
      LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id 
      LIMIT 3
    `);
    
    console.log('\nSAMPLE INVOICES:');
    sampleInvoice.rows.forEach(inv => {
      console.log(`   • Invoice ${inv.invoice_number}: subscription_id=${inv.subscription_id}, user_id=${inv.user_id}`);
    });
    
    // Check if invoices have user_id directly or through subscription
    const directUserCheck = await pool.query(`
      SELECT COUNT(*) as count FROM invoices WHERE user_id IS NOT NULL
    `);
    
    const subscriptionUserCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM invoices i 
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
    `);
    
    console.log('\nINVOICE LINKAGE:');
    console.log(`   • Invoices with direct user_id: ${directUserCheck.rows[0].count}`);
    console.log(`   • Invoices linked through subscription: ${subscriptionUserCheck.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoiceStructure();
