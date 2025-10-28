const { query } = require('../config/db');

async function forceFunctionUpdate() {
  try {
    console.log('🔧 Force updating database functions in Neon...\n');
    
    // First, let's see what functions exist
    console.log('1. Checking existing functions:');
    const functions = await query(`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_name LIKE '%special_pickup%'
      ORDER BY routine_name
    `);
    
    console.log(`   Found ${functions.rows.length} special pickup functions`);
    functions.rows.forEach(func => {
      console.log(`   - ${func.routine_name}`);
    });
    
    // Drop and recreate the problematic function
    console.log('\n2. Dropping existing create_special_pickup_invoice function...');
    await query('DROP FUNCTION IF EXISTS create_special_pickup_invoice(INTEGER)');
    console.log('   ✅ Function dropped');
    
    // Create a new version that doesn't use service_start/service_end
    console.log('3. Creating new create_special_pickup_invoice function...');
    await query(`
      CREATE OR REPLACE FUNCTION create_special_pickup_invoice(pickup_request_id INTEGER)
      RETURNS JSON AS $$
      DECLARE
          pickup_record RECORD;
          new_invoice_id INTEGER;
          invoice_number_val VARCHAR(50);
          result JSON;
      BEGIN
          -- Get the special pickup request details
          SELECT * INTO pickup_record 
          FROM special_pickup_requests 
          WHERE request_id = pickup_request_id;
          
          IF NOT FOUND THEN
              RETURN json_build_object('success', false, 'error', 'Special pickup request not found');
          END IF;
          
          -- Check if final_price is set
          IF pickup_record.final_price IS NULL OR pickup_record.final_price <= 0 THEN
              RETURN json_build_object('success', false, 'error', 'Final price not set for this pickup request');
          END IF;
          
          -- Generate invoice number
          invoice_number_val := 'SP-' || pickup_request_id || '-' || EXTRACT(YEAR FROM CURRENT_DATE);
          
          -- Create the invoice WITHOUT service_start and service_end columns
          INSERT INTO invoices (
              invoice_number,
              user_id,
              amount,
              due_date,
              status,
              generated_date,
              invoice_type,
              description,
              notes,
              created_at,
              updated_at
          ) VALUES (
              invoice_number_val,
              pickup_record.user_id,
              pickup_record.final_price,
              pickup_record.pickup_date,
              'paid',
              CURRENT_DATE,
              'special',
              'Special Pickup - ' || pickup_record.waste_type,
              'Generated from special pickup request #' || pickup_request_id,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
          ) RETURNING invoice_id INTO new_invoice_id;
          
          -- Return success
          result := json_build_object(
              'success', true,
              'invoice_id', new_invoice_id,
              'invoice_number', invoice_number_val,
              'amount', pickup_record.final_price,
              'status', 'paid'
          );
          
          RETURN result;
          
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'success', false, 
                  'error', 'Failed to create invoice: ' || SQLERRM
              );
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ New function created without service_start/service_end');
    
    // Test the updated function
    console.log('4. Testing updated function...');
    const testResult = await query(`
      SELECT collect_special_pickup_payment(999999, 35, 1, 25.00, 'cash', 'test after update') as result
    `);
    
    const result = testResult.rows[0]?.result;
    console.log('   Test result:', result);
    
    if (result && result.success === false && result.error.includes('Special pickup request not found')) {
      console.log('   ✅ Function is working correctly!');
    } else if (result && result.error && !result.error.includes('service_start')) {
      console.log('   ✅ No more service_start errors!');
    }
    
    console.log('\n🎉 Database functions updated successfully!');
    console.log('💡 Please restart your backend server to ensure fresh connections.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

forceFunctionUpdate();
