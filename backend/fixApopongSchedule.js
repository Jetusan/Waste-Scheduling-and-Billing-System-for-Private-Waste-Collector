/**
 * Fix Apopong collection schedule issue
 * Create a Tuesday collection schedule for Apopong barangay
 */

const pool = require('./config/dbAdmin');

async function fixApopongSchedule() {
  console.log('🔧 Fixing Apopong collection schedule...\n');
  
  try {
    // Step 1: Create collection schedule for Tuesday
    console.log('📅 Step 1: Creating Tuesday collection schedule for Apopong...');
    
    const scheduleQuery = `
      INSERT INTO collection_schedules (schedule_date, waste_type, time_range, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING schedule_id
    `;
    
    const scheduleResult = await pool.queryWithRetry(scheduleQuery, [
      'Tuesday',           // schedule_date
      'Residual',         // waste_type (same as City Heights)
      '12am to 12pm'      // time_range (same as City Heights)
    ]);
    
    const scheduleId = scheduleResult.rows[0].schedule_id;
    console.log(`✅ Created schedule ID: ${scheduleId}`);

    // Step 2: Link schedule to Apopong barangay
    console.log('🏘️ Step 2: Linking schedule to Apopong barangay...');
    
    const linkQuery = `
      INSERT INTO schedule_barangays (schedule_id, barangay_id)
      VALUES ($1, $2)
    `;
    
    await pool.queryWithRetry(linkQuery, [scheduleId, 1]); // Apopong ID = 1
    console.log('✅ Linked schedule to Apopong barangay');

    // Step 3: Verify the fix
    console.log('\n🔍 Step 3: Verifying the fix...');
    
    const verifyQuery = `
      SELECT cs.*, b.barangay_name
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      WHERE LOWER(cs.schedule_date) = 'tuesday'
        AND b.barangay_id = 1
    `;
    
    const verifyResult = await pool.queryWithRetry(verifyQuery);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ SUCCESS! Apopong now has Tuesday collection schedule:');
      verifyResult.rows.forEach(row => {
        console.log(`  ${row.barangay_name}: ${row.waste_type} (${row.time_range})`);
      });
    } else {
      console.log('❌ Verification failed - schedule not found');
    }

    // Step 4: Check if there are residents in Apopong
    console.log('\n👥 Step 4: Checking residents in Apopong...');
    
    const residentsQuery = `
      SELECT COUNT(DISTINCT u.user_id) as resident_count
      FROM users u
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND cs.status IN ('active', 'pending_payment')
        AND b.barangay_id = 1
        AND cs.created_at = (
          SELECT MAX(cs2.created_at) 
          FROM customer_subscriptions cs2 
          WHERE cs2.user_id = u.user_id
        )
    `;
    
    const residentsResult = await pool.queryWithRetry(residentsQuery);
    const residentCount = residentsResult.rows[0].resident_count;
    
    console.log(`Found ${residentCount} residents with active subscriptions in Apopong`);
    
    if (residentCount > 0) {
      console.log('✅ Apopong has residents - collections should now work!');
    } else {
      console.log('⚠️ Apopong has no residents with active subscriptions');
      console.log('   This means "No collections available" is correct');
    }

    console.log('\n🎉 FIX COMPLETED!');
    console.log('Now test the collector app - Apopong should have collections available.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixApopongSchedule().then(() => {
  console.log('\n✅ Fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
