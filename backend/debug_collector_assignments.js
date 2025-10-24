// Debug Collector Assignment Issue
const { pool } = require('./config/db');

async function debugCollectorAssignments() {
  console.log('🔍 DEBUGGING COLLECTOR ASSIGNMENT ISSUE\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check what today's date logic produces
    console.log('📅 1. DATE LOGIC ANALYSIS');
    console.log('-'.repeat(40));
    
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    const todayNameUTC = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayDate = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
    
    console.log(`Today (Manila timezone): ${todayName}`);
    console.log(`Today (UTC): ${todayNameUTC}`);
    console.log(`Today's date: ${todayDate}`);
    console.log(`Current timestamp: ${new Date().toISOString()}`);
    
    // 2. Check all collection schedules in database
    console.log('\n📋 2. ALL COLLECTION SCHEDULES IN DATABASE');
    console.log('-'.repeat(40));
    
    const allSchedulesQuery = `
      SELECT 
        cs.schedule_id,
        cs.schedule_date,
        cs.waste_type,
        cs.time_range,
        cs.created_at,
        COUNT(sb.barangay_id) as assigned_barangays,
        STRING_AGG(b.barangay_name, ', ') as barangay_names
      FROM collection_schedules cs
      LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
      GROUP BY cs.schedule_id, cs.schedule_date, cs.waste_type, cs.time_range, cs.created_at
      ORDER BY cs.schedule_date, cs.schedule_id
    `;
    
    const allSchedulesResult = await pool.query(allSchedulesQuery);
    console.log(`Found ${allSchedulesResult.rows.length} total schedules:`);
    
    allSchedulesResult.rows.forEach(schedule => {
      console.log(`   📅 ${schedule.schedule_date} | ${schedule.waste_type} | ${schedule.time_range}`);
      console.log(`      🏘️ Barangays (${schedule.assigned_barangays}): ${schedule.barangay_names || 'None'}`);
      console.log(`      🕐 Created: ${schedule.created_at}`);
      console.log('');
    });
    
    // 3. Check schedules for today specifically
    console.log(`\n🎯 3. SCHEDULES FOR TODAY (${todayName})`);
    console.log('-'.repeat(40));
    
    const todaySchedulesQuery = `
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
      ORDER BY cs.schedule_id, b.barangay_name
    `;
    
    const todaySchedulesResult = await pool.query(todaySchedulesQuery, [todayName]);
    console.log(`Found ${todaySchedulesResult.rows.length} schedules for ${todayName}:`);
    
    if (todaySchedulesResult.rows.length > 0) {
      todaySchedulesResult.rows.forEach(schedule => {
        console.log(`   ✅ Schedule ${schedule.schedule_id}: ${schedule.waste_type} (${schedule.time_range})`);
        console.log(`      🏘️ ${schedule.barangay_name} (ID: ${schedule.barangay_id})`);
      });
    } else {
      console.log(`   ❌ No schedules found for ${todayName}`);
      
      // Check if there are schedules for other days
      console.log('\n🔍 Checking schedules for other days:');
      const otherDaysQuery = `
        SELECT DISTINCT schedule_date, COUNT(*) as count
        FROM collection_schedules
        GROUP BY schedule_date
        ORDER BY schedule_date
      `;
      const otherDaysResult = await pool.query(otherDaysQuery);
      otherDaysResult.rows.forEach(day => {
        console.log(`   📅 ${day.schedule_date}: ${day.count} schedules`);
      });
    }
    
    // 4. Check City Heights specifically
    console.log('\n🏘️ 4. CITY HEIGHTS ANALYSIS');
    console.log('-'.repeat(40));
    
    // Find City Heights barangay ID
    const cityHeightsQuery = `
      SELECT barangay_id, barangay_name 
      FROM barangays 
      WHERE LOWER(barangay_name) LIKE LOWER('%city%height%')
    `;
    const cityHeightsResult = await pool.query(cityHeightsQuery);
    
    if (cityHeightsResult.rows.length > 0) {
      const cityHeights = cityHeightsResult.rows[0];
      console.log(`Found City Heights: ID ${cityHeights.barangay_id}, Name: ${cityHeights.barangay_name}`);
      
      // Check schedules for City Heights
      const cityHeightsSchedulesQuery = `
        SELECT 
          cs.schedule_id,
          cs.schedule_date,
          cs.waste_type,
          cs.time_range,
          cs.created_at
        FROM collection_schedules cs
        JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
        WHERE sb.barangay_id = $1
        ORDER BY cs.schedule_date
      `;
      
      const cityHeightsSchedulesResult = await pool.query(cityHeightsSchedulesQuery, [cityHeights.barangay_id]);
      console.log(`\n📋 City Heights has ${cityHeightsSchedulesResult.rows.length} schedules:`);
      
      cityHeightsSchedulesResult.rows.forEach(schedule => {
        const isToday = schedule.schedule_date.toLowerCase() === todayName.toLowerCase();
        console.log(`   ${isToday ? '✅' : '📅'} ${schedule.schedule_date} | ${schedule.waste_type} | ${schedule.time_range}`);
        if (isToday) {
          console.log(`      🎯 THIS IS TODAY'S SCHEDULE!`);
        }
      });
      
      // Check users in City Heights
      const cityHeightsUsersQuery = `
        SELECT 
          u.user_id,
          u.username,
          cs.status as subscription_status,
          cs.created_at as subscription_date
        FROM users u
        JOIN addresses a ON u.address_id = a.address_id
        LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
          AND cs.created_at = (
            SELECT MAX(cs2.created_at) 
            FROM customer_subscriptions cs2 
            WHERE cs2.user_id = u.user_id
          )
        WHERE a.barangay_id = $1
        ORDER BY u.username
      `;
      
      const cityHeightsUsersResult = await pool.query(cityHeightsUsersQuery, [cityHeights.barangay_id]);
      console.log(`\n👥 City Heights has ${cityHeightsUsersResult.rows.length} users:`);
      
      cityHeightsUsersResult.rows.forEach(user => {
        console.log(`   👤 ${user.username} (ID: ${user.user_id})`);
        console.log(`      📋 Subscription: ${user.subscription_status || 'None'}`);
        if (user.subscription_date) {
          console.log(`      📅 Since: ${user.subscription_date}`);
        }
      });
      
    } else {
      console.log('❌ City Heights barangay not found!');
      
      // Show all barangays
      const allBarangaysQuery = 'SELECT barangay_id, barangay_name FROM barangays ORDER BY barangay_name';
      const allBarangaysResult = await pool.query(allBarangaysQuery);
      console.log('\n📋 Available barangays:');
      allBarangaysResult.rows.forEach(barangay => {
        console.log(`   🏘️ ${barangay.barangay_name} (ID: ${barangay.barangay_id})`);
      });
    }
    
    // 5. Test the exact collector assignment query
    console.log('\n🔧 5. TESTING COLLECTOR ASSIGNMENT QUERY');
    console.log('-'.repeat(40));
    
    if (cityHeightsResult.rows.length > 0) {
      const cityHeightsId = cityHeightsResult.rows[0].barangay_id;
      
      // This is the exact query from collectorAssignments.js
      const testQuery = `
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
      
      console.log(`Testing query for ${todayName} in City Heights (ID: ${cityHeightsId})`);
      console.log(`Query: ${testQuery}`);
      console.log(`Params: [${todayName}, ${cityHeightsId}]`);
      
      const testResult = await pool.query(testQuery, [todayName, cityHeightsId]);
      console.log(`\n📊 Query Result: ${testResult.rows.length} rows`);
      
      if (testResult.rows.length > 0) {
        console.log('✅ SCHEDULES FOUND:');
        testResult.rows.forEach(row => {
          console.log(`   Schedule ID: ${row.schedule_id}`);
          console.log(`   Date: ${row.schedule_date}`);
          console.log(`   Waste Type: ${row.waste_type}`);
          console.log(`   Time: ${row.time_range}`);
          console.log(`   Barangay: ${row.barangay_name}`);
          console.log('');
        });
      } else {
        console.log('❌ NO SCHEDULES FOUND - This is the problem!');
        
        // Debug why no schedules found
        console.log('\n🔍 DEBUGGING WHY NO SCHEDULES:');
        
        // Check if schedule_date matching is the issue
        const dateMatchQuery = `
          SELECT schedule_date, LOWER(schedule_date) as lower_date
          FROM collection_schedules
          WHERE schedule_id IN (
            SELECT cs.schedule_id
            FROM collection_schedules cs
            JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
            WHERE sb.barangay_id = $1
          )
        `;
        
        const dateMatchResult = await pool.query(dateMatchQuery, [cityHeightsId]);
        console.log('📅 Schedule dates for City Heights:');
        dateMatchResult.rows.forEach(row => {
          const matches = row.lower_date === todayName.toLowerCase();
          console.log(`   ${row.schedule_date} (lower: ${row.lower_date}) ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
        });
        
        console.log(`\n🎯 Looking for: ${todayName.toLowerCase()}`);
      }
    }
    
    // 6. Summary and recommendations
    console.log('\n📝 6. SUMMARY AND RECOMMENDATIONS');
    console.log('-'.repeat(40));
    
    console.log('🎯 ISSUE ANALYSIS:');
    if (todaySchedulesResult.rows.length === 0) {
      console.log(`   ❌ No schedules found for ${todayName}`);
      console.log('   🔧 SOLUTION: Create schedules for today or check date format');
    } else {
      console.log(`   ✅ Schedules exist for ${todayName}`);
      console.log('   🔧 SOLUTION: Check barangay assignment or user subscription filtering');
    }
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('   1. Verify schedule_date format matches weekday names');
    console.log('   2. Check schedule_barangays table for proper assignments');
    console.log('   3. Verify user subscription status filtering');
    console.log('   4. Make assignment logic more flexible with date matching');
    
    console.log('\n🎉 Debug Analysis Complete!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugCollectorAssignments();
