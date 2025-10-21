/**
 * Test the exact same API call that the frontend makes
 * This will help us debug why the frontend gets "no collections available"
 */

const pool = require('./config/dbAdmin');

async function testFrontendAPI() {
  console.log('🧪 Testing the exact API call that frontend makes...');
  
  try {
    // Step 1: Get a collector ID from the database
    console.log('\n🔍 Step 1: Finding collector IDs in database...');
    const collectorsQuery = 'SELECT collector_id, user_id FROM collectors ORDER BY collector_id';
    const collectorsResult = await pool.queryWithRetry(collectorsQuery);
    
    console.log(`Found ${collectorsResult.rows.length} collectors:`);
    collectorsResult.rows.forEach(c => {
      console.log(`  Collector ID: ${c.collector_id}, User ID: ${c.user_id}`);
    });
    
    if (collectorsResult.rows.length === 0) {
      console.log('❌ No collectors found in database!');
      return;
    }
    
    // Use the first collector
    const testCollectorId = collectorsResult.rows[0].collector_id;
    const testUserId = collectorsResult.rows[0].user_id;
    console.log(`\n🎯 Using Collector ID: ${testCollectorId} (User ID: ${testUserId})`);
    
    // Step 2: Test the API endpoint that frontend calls
    console.log('\n🔗 Step 2: Testing API endpoint...');
    
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      timeZone: 'Asia/Manila' 
    });
    console.log(`📅 Today: ${today}`);
    
    // Simulate the exact query the API makes
    console.log('\n📋 Step 3: Checking collection schedules (API simulation)...');
    const scheduleQuery = `
      SELECT DISTINCT
        cs.schedule_id,
        cs.schedule_date,
        cs.waste_type,
        cs.time_range,
        b.barangay_id,
        b.barangay_name
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      WHERE LOWER(cs.schedule_date) = LOWER($1)
        AND b.barangay_id = $2
      ORDER BY cs.schedule_id, b.barangay_name
    `;
    
    const cityHeightsId = 19;
    const schedulesResult = await pool.queryWithRetry(scheduleQuery, [today, cityHeightsId]);
    console.log(`   Found ${schedulesResult.rows.length} schedules for ${today} in City Heights`);
    
    if (schedulesResult.rows.length === 0) {
      console.log('❌ No schedules found - this is why frontend fails!');
      return;
    }
    
    schedulesResult.rows.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.waste_type} - ${s.time_range}`);
    });
    
    // Step 4: Check residents query
    console.log('\n👥 Step 4: Checking residents query (API simulation)...');
    const scheduledBarangayIds = [cityHeightsId];
    
    const residentsQuery = `
      SELECT DISTINCT
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown Resident') AS resident_name,
        COALESCE(a.full_address, COALESCE(a.street, '') || ', ' || COALESCE(b.barangay_name, '')) AS address,
        b.barangay_id,
        b.barangay_name,
        cs.status as subscription_status,
        cs.subscription_id
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND u.user_id IS NOT NULL
        AND cs.status IN ('active', 'pending_payment')
        AND b.barangay_id = ANY($1)
        AND cs.created_at = (
          SELECT MAX(cs2.created_at) 
          FROM customer_subscriptions cs2 
          WHERE cs2.user_id = u.user_id
        )
      ORDER BY b.barangay_name, u.user_id LIMIT 50
    `;
    
    const residentsResult = await pool.queryWithRetry(residentsQuery, [scheduledBarangayIds]);
    console.log(`   Found ${residentsResult.rows.length} residents with active subscriptions`);
    
    if (residentsResult.rows.length === 0) {
      console.log('❌ No residents found - this is why frontend fails!');
      return;
    }
    
    // Step 5: Build the response like the API does
    console.log('\n📦 Step 5: Building API response...');
    const stops = [];
    let stopCounter = 1;
    const primarySchedule = schedulesResult.rows[0];
    
    for (const resident of residentsResult.rows) {
      const residentSchedule = schedulesResult.rows.find(s => s.barangay_id === resident.barangay_id) || primarySchedule;
      const stopId = `${today.toLowerCase()}-${residentSchedule.waste_type.toLowerCase()}-${resident.user_id}`;
      
      stops.push({
        stop_id: stopId,
        sequence_no: stopCounter++,
        user_id: resident.user_id,
        resident_name: resident.resident_name,
        address: resident.address,
        barangay_id: resident.barangay_id,
        barangay_name: resident.barangay_name,
        planned_waste_type: residentSchedule.waste_type,
        schedule_id: residentSchedule.schedule_id,
        time_range: residentSchedule.time_range,
        latest_action: null,
        latest_updated_at: null,
        subscription_status: resident.subscription_status,
        subscription_id: resident.subscription_id
      });
    }
    
    const assignment = {
      schedule_id: primarySchedule.schedule_id,
      waste_type: primarySchedule.waste_type,
      time_range: primarySchedule.time_range,
      date_label: today,
      schedule_date: today,
      barangay_count: scheduledBarangayIds.length
    };
    
    const apiResponse = { assignment, stops };
    
    console.log(`✅ API Response would be:`);
    console.log(`   Assignment: ${assignment.waste_type} collection on ${today}`);
    console.log(`   Stops: ${stops.length} residents`);
    console.log(`   First few residents:`);
    stops.slice(0, 3).forEach((stop, i) => {
      console.log(`     ${i + 1}. ${stop.resident_name} - ${stop.address}`);
    });
    
    console.log('\n🎯 CONCLUSION:');
    if (stops.length > 0) {
      console.log('✅ API should return residents - frontend issue might be elsewhere');
      console.log('   Check: Authentication, collector ID, API URL, response parsing');
    } else {
      console.log('❌ API would return empty stops - this explains the frontend issue');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFrontendAPI().then(() => {
  console.log('\n✅ Frontend API test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
