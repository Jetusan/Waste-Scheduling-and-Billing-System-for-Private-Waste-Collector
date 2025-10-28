const { query } = require('../config/db');

async function testProductionDatabase() {
  try {
    console.log('🔍 Testing production database schema...\n');
    
    // Test 1: Check if service_start and service_end columns exist
    console.log('1. Checking invoices table columns:');
    try {
      const columnsResult = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name IN ('service_start', 'service_end')
        ORDER BY column_name
      `);
      
      if (columnsResult.rows.length > 0) {
        columnsResult.rows.forEach(row => {
          console.log(`   ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
      } else {
        console.log('   ❌ service_start and service_end columns NOT FOUND');
        
        // Try to add them
        console.log('\n🔧 Attempting to add missing columns...');
        await query(`
          ALTER TABLE invoices 
          ADD COLUMN IF NOT EXISTS service_start DATE,
          ADD COLUMN IF NOT EXISTS service_end DATE
        `);
        console.log('   ✅ Columns added successfully');
      }
    } catch (err) {
      console.log(`   ❌ Error checking columns: ${err.message}`);
    }
    
    // Test 2: Try to execute the collect_special_pickup_payment function
    console.log('\n2. Testing collect_special_pickup_payment function:');
    try {
      const testResult = await query(`
        SELECT collect_special_pickup_payment(999999, 35, 1, 25.00, 'cash', 'test payment') as result
      `);
      
      const result = testResult.rows[0]?.result;
      if (result && result.success === false) {
        console.log(`   ✅ Function executed (expected failure for test ID): ${result.error}`);
      } else {
        console.log('   ✅ Function executed successfully');
      }
    } catch (err) {
      console.log(`   ❌ Function execution failed: ${err.message}`);
      
      if (err.message.includes('service_start')) {
        console.log('   🔧 The function is still referencing service_start column');
        console.log('   💡 This means the database function needs to be updated');
      }
    }
    
    // Test 3: Check database connection info
    console.log('\n3. Database connection info:');
    try {
      const dbInfo = await query('SELECT current_database(), current_user, version()');
      console.log(`   Database: ${dbInfo.rows[0].current_database}`);
      console.log(`   User: ${dbInfo.rows[0].current_user}`);
      console.log(`   Version: ${dbInfo.rows[0].version.split(' ')[0]} ${dbInfo.rows[0].version.split(' ')[1]}`);
    } catch (err) {
      console.log(`   ❌ Error getting DB info: ${err.message}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testProductionDatabase();
