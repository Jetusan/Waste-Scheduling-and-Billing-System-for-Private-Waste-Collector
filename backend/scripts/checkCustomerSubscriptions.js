const { pool } = require('../config/db');

async function checkCustomerSubscriptions() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customer_subscriptions' 
      ORDER BY ordinal_position
    `);
    
    console.log('CUSTOMER_SUBSCRIPTIONS table columns:');
    result.rows.forEach(col => {
      console.log(`• ${col.column_name} - ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCustomerSubscriptions();
