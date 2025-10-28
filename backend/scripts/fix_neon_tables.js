const { query } = require('../config/db');

async function fixNeonTables() {
  try {
    console.log('🔧 Creating missing table in Neon database...');
    
    // Create collector_cash_on_hand table
    await query(`
      CREATE TABLE IF NOT EXISTS collector_cash_on_hand (
        cash_id SERIAL PRIMARY KEY,
        collector_id INTEGER NOT NULL REFERENCES collectors(collector_id),
        transaction_type VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reference_id INTEGER,
        reference_type VARCHAR(20),
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ collector_cash_on_hand table created in Neon!');
    
    // Test the payment function now
    console.log('🧪 Testing payment function...');
    const testResult = await query(`
      SELECT collect_special_pickup_payment(999999, 35, 1, 25.00, 'cash', 'test') as result
    `);
    
    const result = testResult.rows[0]?.result;
    if (result && result.error && result.error.includes('Special pickup request not found')) {
      console.log('✅ Payment function is working! (Expected error for test ID)');
    } else {
      console.log('Result:', result);
    }
    
    console.log('🎉 Neon database is now ready for special pickup payments!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixNeonTables();
