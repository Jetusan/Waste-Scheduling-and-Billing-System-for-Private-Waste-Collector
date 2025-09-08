const { pool } = require('../config/db');

const checkPaymentSources = async () => {
  try {
    console.log('🔍 Fetching data from payment_sources table...');
    
    // Connect to database
    await pool.connect();
    console.log('\n✅ Database connected successfully!');
    
    // Get all payment sources
    const result = await pool.query('SELECT * FROM payment_sources ORDER BY created_at DESC');
    
    if (result.rows.length === 0) {
      console.log('📭 No payment sources found in the database.');
    } else {
      console.log('✅ Payment Sources Table Data:\n');
      console.table(result.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkPaymentSources();
