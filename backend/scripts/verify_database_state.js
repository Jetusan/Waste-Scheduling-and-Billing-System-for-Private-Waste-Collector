const { query } = require('../config/db');

async function verifyDatabaseState() {
  try {
    console.log('🔍 Checking current database state...\n');
    
    // Check if columns exist
    console.log('1. Checking invoices table columns:');
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name IN ('service_start', 'service_end', 'invoice_number', 'user_id', 'amount')
      ORDER BY column_name
    `);
    
    if (columnsResult.rows.length > 0) {
      columnsResult.rows.forEach(row => {
        console.log(`   ✓ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('   ❌ No columns found');
    }
    
    // Check current function definition
    console.log('\n2. Checking create_special_pickup_invoice function:');
    try {
      const funcResult = await query(`
        SELECT routine_name, routine_definition 
        FROM information_schema.routines 
        WHERE routine_name = 'create_special_pickup_invoice'
      `);
      
      if (funcResult.rows.length > 0) {
        console.log('   ✓ Function exists');
        const definition = funcResult.rows[0].routine_definition;
        if (definition.includes('service_start')) {
          console.log('   ⚠️  Function still references service_start');
        } else {
          console.log('   ✓ Function does not reference service_start');
        }
      } else {
        console.log('   ❌ Function not found');
      }
    } catch (err) {
      console.log('   ❌ Error checking function:', err.message);
    }
    
    // Test a simple query to invoices table
    console.log('\n3. Testing invoices table access:');
    try {
      const testResult = await query(`
        SELECT COUNT(*) as count, 
               COUNT(service_start) as service_start_count,
               COUNT(service_end) as service_end_count
        FROM invoices 
        LIMIT 1
      `);
      console.log('   ✓ Table accessible');
      console.log(`   ✓ Total invoices: ${testResult.rows[0].count}`);
      console.log(`   ✓ Records with service_start: ${testResult.rows[0].service_start_count}`);
      console.log(`   ✓ Records with service_end: ${testResult.rows[0].service_end_count}`);
    } catch (err) {
      console.log('   ❌ Error accessing table:', err.message);
    }
    
    // Check if there are any special pickup requests
    console.log('\n4. Checking special pickup requests:');
    try {
      const spResult = await query(`
        SELECT COUNT(*) as count,
               COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count
        FROM special_pickup_requests
      `);
      console.log(`   ✓ Total special pickup requests: ${spResult.rows[0].count}`);
      console.log(`   ✓ In progress requests: ${spResult.rows[0].in_progress_count}`);
    } catch (err) {
      console.log('   ❌ Error checking special pickup requests:', err.message);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error verifying database state:', err.message);
    process.exit(1);
  }
}

verifyDatabaseState();
