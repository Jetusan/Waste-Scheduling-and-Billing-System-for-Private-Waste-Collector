/**
 * Backend Test Script - Test Collection Users
 * Run this in the backend to test if there are users available for collection
 * 
 * Usage: node testCollectionUsers.js
 */

const pool = require('./config/dbAdmin');

/**
 * Get barangay ID by name (case-insensitive)
 * @param {string} barangayName 
 * @returns {Promise<number|null>}
 */
async function getBarangayId(barangayName) {
  try {
    const result = await pool.queryWithRetry(
      'SELECT barangay_id FROM barangays WHERE LOWER(barangay_name) = LOWER($1)',
      [barangayName]
    );
    return result.rows.length > 0 ? result.rows[0].barangay_id : null;
  } catch (error) {
    console.error('Error getting barangay ID:', error);
    return null;
  }
}

/**
 * Test if there are users available for collection in a specific barangay
 * @param {string} barangayId - The barangay ID to test
 * @param {string} barangayName - The barangay name for display
 * @param {string} collectorId - The collector ID (optional)
 */
async function testCollectionUsers(barangayId = null, barangayName = 'City Heights', collectorId = null) {
  try {
    // If no barangayId provided, look it up by name
    if (!barangayId) {
      barangayId = await getBarangayId(barangayName);
      if (!barangayId) {
        console.log(`❌ Barangay '${barangayName}' not found in database`);
        return {
          success: false,
          error: `Barangay '${barangayName}' not found`,
          userCount: 0
        };
      }
    }
    
    console.log(`🧪 [Backend Test] Testing collection users for ${barangayName} (ID: ${barangayId})`);
    
    try {
    // Get current day
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      timeZone: 'Asia/Manila' 
    });
    console.log(`📅 Testing for: ${today}`);

    // Step 1: Check if there are collection schedules for today
    console.log('\n📋 Step 1: Checking collection schedules...');
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
      ORDER BY cs.schedule_id
    `;
    
    const scheduleResult = await pool.queryWithRetry(scheduleQuery, [today, parseInt(barangayId)]);
    console.log(`   Found ${scheduleResult.rows.length} collection schedules for ${today}`);
    
    if (scheduleResult.rows.length === 0) {
      console.log(`❌ No collection schedules found for ${today} in ${barangayName}`);
      return {
        success: false,
        error: `No collection schedules for ${today}`,
        userCount: 0,
        schedules: 0,
        today,
        barangayName
      };
    }

    scheduleResult.rows.forEach((schedule, index) => {
      console.log(`   ${index + 1}. ${schedule.waste_type} - ${schedule.time_range}`);
    });

    // Step 2: Get residents with active subscriptions in this barangay
    console.log('\n👥 Step 2: Checking residents with active subscriptions...');
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
        AND b.barangay_id = $1
        AND cs.created_at = (
          SELECT MAX(cs2.created_at) 
          FROM customer_subscriptions cs2 
          WHERE cs2.user_id = u.user_id
        )
      ORDER BY u.user_id
      LIMIT 50
    `;
    
    const residentsResult = await pool.queryWithRetry(residentsQuery, [parseInt(barangayId)]);
    const userCount = residentsResult.rows.length;
    
    console.log(`   Found ${userCount} residents with active subscriptions`);
    
    if (userCount === 0) {
      console.log(`❌ No residents with active subscriptions found in ${barangayName}`);
      return {
        success: false,
        error: 'No residents with active subscriptions',
        userCount: 0,
        schedules: scheduleResult.rows.length,
        today,
        barangayName
      };
    }

    // Step 3: Show user details
    console.log('\n📊 Step 3: User details:');
    residentsResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.resident_name}`);
      console.log(`      Address: ${user.address}`);
      console.log(`      Subscription: ${user.subscription_status}`);
      console.log(`      User ID: ${user.user_id}`);
    });

    // Success!
    console.log(`\n✅ SUCCESS: Found ${userCount} users ready for collection in ${barangayName} on ${today}`);
    
    return {
      success: true,
      hasUsers: true,
      userCount,
      users: residentsResult.rows,
      schedules: scheduleResult.rows.length,
      today,
      barangayName,
      message: `Found ${userCount} users ready for collection`
    };

    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error.message,
        userCount: 0,
        today: new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' }),
        barangayName
      };
    }
  } catch (error) {
    console.error('❌ Outer test failed:', error);
    return {
      success: false,
      error: error.message,
      userCount: 0,
      today: new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' }),
      barangayName
    };
  }
}

/**
 * Test multiple barangays
 */
async function testAllBarangays() {
  console.log('🧪 [Backend Test] Testing all barangays...\n');
  
  try {
    // Get all barangays
    const barangaysQuery = 'SELECT barangay_id, barangay_name FROM barangays ORDER BY barangay_name';
    const barangaysResult = await pool.queryWithRetry(barangaysQuery);
    
    console.log(`Found ${barangaysResult.rows.length} barangays in database`);
    
    const results = [];
    
    for (const barangay of barangaysResult.rows) {
      console.log('\n' + '='.repeat(60));
      const result = await testCollectionUsers(
        barangay.barangay_id.toString(), 
        barangay.barangay_name
      );
      
      results.push({
        barangay: barangay.barangay_name,
        barangayId: barangay.barangay_id,
        hasUsers: result.hasUsers || false,
        userCount: result.userCount,
        schedules: result.schedules || 0,
        success: result.success,
        error: result.error
      });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY OF ALL BARANGAYS:');
    console.log('='.repeat(60));
    
    results.forEach(result => {
      const status = result.success && result.hasUsers ? '✅' : '❌';
      console.log(`${status} ${result.barangay}: ${result.userCount} users, ${result.schedules} schedules`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const totalUsers = results.reduce((sum, r) => sum + r.userCount, 0);
    const barangaysWithUsers = results.filter(r => r.hasUsers).length;
    const barangaysWithSchedules = results.filter(r => r.schedules > 0).length;
    
    console.log('\n📈 OVERALL SUMMARY:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Barangays with users: ${barangaysWithUsers}/${results.length}`);
    console.log(`   Barangays with schedules: ${barangaysWithSchedules}/${results.length}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to test all barangays:', error);
    return [];
  }
}

/**
 * Main function - run the test
 */
async function main() {
  console.log('🚀 Starting Collection Users Test...\n');
  
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length >= 2) {
    // Test specific barangay: node testCollectionUsers.js 1 "City Heights"
    const barangayId = args[0];
    const barangayName = args[1];
    await testCollectionUsers(barangayId, barangayName);
  } else if (args[0] === 'all') {
    // Test all barangays: node testCollectionUsers.js all
    await testAllBarangays();
  } else {
    // Default test
    console.log('Usage:');
    console.log('  node testCollectionUsers.js                      - Test default barangay (City Heights)');
    console.log('  node testCollectionUsers.js 19 "City Heights"    - Test specific barangay by ID');
    console.log('  node testCollectionUsers.js null "City Heights"  - Test barangay by name (auto-lookup ID)');
    console.log('  node testCollectionUsers.js all                  - Test all barangays');
    console.log('');
    
    // Run default test
    await testCollectionUsers();
  }
  
  console.log('\n✅ Test completed!');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testCollectionUsers,
  testAllBarangays
};
