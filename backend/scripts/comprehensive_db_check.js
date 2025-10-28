const { query } = require('../config/db');

async function comprehensiveDbCheck() {
  try {
    console.log('🔍 COMPREHENSIVE DATABASE CHECK - NEON\n');
    
    // 1. Check invoices table structure
    console.log('1. INVOICES TABLE STRUCTURE:');
    const invoicesColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    
    console.log('   Columns in invoices table:');
    invoicesColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    const hasServiceStart = invoicesColumns.rows.some(col => col.column_name === 'service_start');
    const hasServiceEnd = invoicesColumns.rows.some(col => col.column_name === 'service_end');
    
    if (!hasServiceStart || !hasServiceEnd) {
      console.log('\n   ❌ MISSING COLUMNS DETECTED! Adding them...');
      await query(`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS service_start DATE,
        ADD COLUMN IF NOT EXISTS service_end DATE
      `);
      console.log('   ✅ service_start and service_end columns added');
    } else {
      console.log('   ✅ service_start and service_end columns exist');
    }
    
    // 2. Check all functions that might reference service_start
    console.log('\n2. FUNCTIONS REFERENCING service_start:');
    const functions = await query(`
      SELECT routine_name, routine_definition
      FROM information_schema.routines 
      WHERE routine_definition ILIKE '%service_start%'
      OR routine_name LIKE '%special_pickup%'
      ORDER BY routine_name
    `);
    
    console.log(`   Found ${functions.rows.length} functions:`);
    functions.rows.forEach(func => {
      const hasServiceStart = func.routine_definition && func.routine_definition.includes('service_start');
      console.log(`   - ${func.routine_name} ${hasServiceStart ? '❌ (uses service_start)' : '✅'}`);
    });
    
    // 3. Fix any functions still using service_start
    console.log('\n3. FIXING ALL FUNCTIONS:');
    
    // Drop and recreate create_special_pickup_invoice without service_start
    await query('DROP FUNCTION IF EXISTS create_special_pickup_invoice(INTEGER) CASCADE');
    console.log('   ✅ Dropped old create_special_pickup_invoice');
    
    await query(`
      CREATE OR REPLACE FUNCTION create_special_pickup_invoice(pickup_request_id INTEGER)
      RETURNS JSON AS $$
      DECLARE
          pickup_record RECORD;
          new_invoice_id INTEGER;
          invoice_number_val VARCHAR(50);
      BEGIN
          SELECT * INTO pickup_record FROM special_pickup_requests WHERE request_id = pickup_request_id;
          
          IF NOT FOUND THEN
              RETURN json_build_object('success', false, 'error', 'Special pickup request not found');
          END IF;
          
          IF pickup_record.final_price IS NULL OR pickup_record.final_price <= 0 THEN
              RETURN json_build_object('success', false, 'error', 'Final price not set');
          END IF;
          
          invoice_number_val := 'SP-' || pickup_request_id || '-' || EXTRACT(YEAR FROM CURRENT_DATE);
          
          -- Insert WITHOUT service_start and service_end
          INSERT INTO invoices (
              invoice_number, user_id, amount, due_date, status, 
              generated_date, invoice_type, description, notes, 
              created_at, updated_at
          ) VALUES (
              invoice_number_val, pickup_record.user_id, pickup_record.final_price,
              pickup_record.pickup_date, 'paid', CURRENT_DATE, 'special',
              'Special Pickup - ' || pickup_record.waste_type,
              'Generated from special pickup request #' || pickup_request_id,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING invoice_id INTO new_invoice_id;
          
          RETURN json_build_object('success', true, 'invoice_id', new_invoice_id);
          
      EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object('success', false, 'error', SQLERRM);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Created new create_special_pickup_invoice (no service_start)');
    
    // 4. Check special_pickup_requests table
    console.log('\n4. SPECIAL_PICKUP_REQUESTS TABLE:');
    const spColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'special_pickup_requests' 
      ORDER BY ordinal_position
    `);
    
    console.log('   Columns:');
    spColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // 5. Test the payment function end-to-end
    console.log('\n5. TESTING PAYMENT FUNCTION:');
    try {
      const testResult = await query(`
        SELECT collect_special_pickup_payment(999999, 35, 1, 25.00, 'cash', 'comprehensive test') as result
      `);
      
      const result = testResult.rows[0]?.result;
      console.log('   Function result:', JSON.stringify(result, null, 2));
      
      if (result && result.error && result.error.includes('service_start')) {
        console.log('   ❌ STILL HAS service_start ERROR!');
      } else {
        console.log('   ✅ NO service_start errors detected');
      }
    } catch (err) {
      if (err.message.includes('service_start')) {
        console.log('   ❌ FUNCTION STILL REFERENCES service_start:', err.message);
      } else {
        console.log('   ✅ No service_start errors, other error:', err.message);
      }
    }
    
    // 6. Force refresh database connections
    console.log('\n6. CONNECTION INFO:');
    const dbInfo = await query('SELECT current_database(), current_user, version()');
    console.log(`   Database: ${dbInfo.rows[0].current_database}`);
    console.log(`   User: ${dbInfo.rows[0].current_user}`);
    
    console.log('\n🎉 COMPREHENSIVE CHECK COMPLETE!');
    console.log('💡 If error persists, restart your backend server completely.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Comprehensive check failed:', err.message);
    process.exit(1);
  }
}

comprehensiveDbCheck();
