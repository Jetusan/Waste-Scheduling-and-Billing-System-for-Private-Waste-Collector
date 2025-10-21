/**
 * Test the API endpoint directly to see what it returns
 */

const express = require('express');
const pool = require('./config/dbAdmin');

// Simulate the exact API call
async function testAPIEndpoint() {
  console.log('🧪 Testing API endpoint directly...');
  
  try {
    const collector_id = '6';
    const barangay_id = '19';
    
    console.log(`🔗 Testing: /api/collector/assignments/today?collector_id=${collector_id}&barangay_id=${barangay_id}`);
    
    // Copy the exact logic from collectorAssignments.js
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    console.log(`📅 Today: ${todayName}`);
    
    // Step 1: Check collection schedules
    let scheduleQuery = `
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
    `;
    
    const scheduleParams = [todayName];
    
    // Add barangay filter if specified
    if (barangay_id) {
      scheduleQuery += ` AND b.barangay_id = $${scheduleParams.length + 1}`;
      scheduleParams.push(parseInt(barangay_id, 10));
      console.log(`🏘️ Filtering schedules by barangay_id: ${barangay_id}`);
    }
    
    scheduleQuery += ` ORDER BY cs.schedule_id, b.barangay_name`;

    let schedulesResult;
    try {
      schedulesResult = await pool.queryWithRetry(scheduleQuery, scheduleParams);
      console.log(`📅 Found ${schedulesResult.rows.length} collection schedules for ${todayName}`);
      
      if (schedulesResult.rows.length === 0) {
        console.log(`❌ No collection schedules found for ${todayName}${barangay_id ? ` in barangay ${barangay_id}` : ''}`);
        const response = { 
          assignment: null,
          stops: [],
          message: `No collection schedules for ${todayName}${barangay_id ? ' in selected barangay' : ''}`
        };
        console.log('📦 API Response:', JSON.stringify(response, null, 2));
        return response;
      }
    } catch (e) {
      console.error(`❌ Error querying schedules:`, e.message);
      return { error: 'Failed to fetch collection schedules' };
    }

    // Step 2: Get residents with active subscriptions
    const scheduledBarangayIds = [...new Set(schedulesResult.rows.map(s => s.barangay_id))];
    
    let residentsQuery = `
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
    `;
    
    const queryParams = [scheduledBarangayIds];
    
    // Add specific barangay filter if specified
    if (barangay_id) {
      residentsQuery += ` AND b.barangay_id = $${queryParams.length + 1}`;
      queryParams.push(parseInt(barangay_id, 10));
    }
    
    residentsQuery += ` ORDER BY b.barangay_name, u.user_id LIMIT 50`;

    let residentsResult;
    try {
      residentsResult = await pool.queryWithRetry(residentsQuery, queryParams);
      console.log(`🏠 Found ${residentsResult.rows.length} subscribed residents in scheduled barangays`);
    } catch (e) {
      console.error(`❌ Error querying residents:`, e.message);
      return { error: 'Failed to fetch residents' };
    }

    if (residentsResult.rows.length === 0) {
      console.log(`❌ No subscribed residents found for ${todayName}${barangay_id ? ` in barangay ${barangay_id}` : ''}`);
      const response = { 
        assignment: null, 
        stops: [],
        message: `No residents with active subscriptions found for collection today${barangay_id ? ' in selected barangay' : ''}`
      };
      console.log('📦 API Response:', JSON.stringify(response, null, 2));
      return response;
    }

    // Step 3: Build stops from residents
    const stops = [];
    let stopCounter = 1;
    const primarySchedule = schedulesResult.rows[0];
    
    console.log(`📋 Building stops for ${residentsResult.rows.length} residents`);
    
    for (const resident of residentsResult.rows) {
      const residentSchedule = schedulesResult.rows.find(s => s.barangay_id === resident.barangay_id) || primarySchedule;
      const stopId = `${todayName.toLowerCase()}-${residentSchedule.waste_type.toLowerCase()}-${resident.user_id}`;
      
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

    // Build assignment object
    const assignment = {
      schedule_id: primarySchedule.schedule_id,
      waste_type: primarySchedule.waste_type,
      time_range: primarySchedule.time_range,
      date_label: todayName,
      schedule_date: todayName,
      barangay_count: scheduledBarangayIds.length
    };

    const response = { assignment, stops };
    
    console.log(`📋 Returning schedule-integrated assignment for ${todayName}`);
    console.log(`🚚 Returning ${stops.length} stops from ${scheduledBarangayIds.length} scheduled barangays`);
    
    console.log('📦 Final API Response:');
    console.log(`   Assignment: ${assignment.waste_type} on ${assignment.schedule_date}`);
    console.log(`   Stops: ${stops.length}`);
    console.log(`   First 3 stops:`);
    stops.slice(0, 3).forEach((stop, i) => {
      console.log(`     ${i + 1}. ${stop.resident_name} - ${stop.subscription_status}`);
    });
    
    return response;

  } catch (err) {
    console.error('❌ Error building today assignment:', err);
    return { error: 'Failed to fetch today\'s assignment', message: err.message };
  }
}

// Run the test
testAPIEndpoint().then((result) => {
  console.log('\n✅ Direct API test completed!');
  console.log(`\n🎯 RESULT: ${result.stops ? `${result.stops.length} stops found` : 'No stops found'}`);
  
  if (result.stops && result.stops.length > 0) {
    console.log('✅ API is working correctly - frontend issue is elsewhere');
  } else {
    console.log('❌ API returns no stops - this explains the frontend issue');
    console.log('   Message:', result.message || result.error);
  }
  
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
