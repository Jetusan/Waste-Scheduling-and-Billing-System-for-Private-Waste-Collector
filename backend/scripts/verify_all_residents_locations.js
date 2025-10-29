const pool = require('../config/db');

async function verifyAllResidentsLocations() {
  try {
    console.log('🔍 Verifying all residents have locations for regular collection...\n');
    
    // Get all approved residents (role = 3)
    const allResidentsQuery = `
      SELECT u.user_id, u.username, u.approval_status,
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
             a.full_address, a.subdivision, b.barangay_name,
             ul.latitude, ul.longitude, ul.captured_at, ul.source
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN user_locations ul ON u.user_id = ul.user_id AND ul.kind = 'home' AND ul.is_current = true
      WHERE u.role_id = 3
      ORDER BY u.approval_status, u.user_id
    `;
    
    const result = await pool.query(allResidentsQuery);
    console.log(`📊 Total residents (role = 3): ${result.rows.length}`);
    
    // Categorize residents
    const approved = result.rows.filter(r => r.approval_status === 'approved');
    const pending = result.rows.filter(r => r.approval_status === 'pending');
    const rejected = result.rows.filter(r => r.approval_status === 'rejected');
    
    console.log(`   ✅ Approved: ${approved.length}`);
    console.log(`   ⏳ Pending: ${pending.length}`);
    console.log(`   ❌ Rejected: ${rejected.length}`);
    
    // Check locations for approved residents (these are the ones that matter for collection)
    console.log('\n🎯 APPROVED RESIDENTS - Collection Status:');
    const approvedWithLocations = approved.filter(r => r.latitude);
    const approvedWithoutLocations = approved.filter(r => !r.latitude);
    
    console.log(`   ✅ With locations: ${approvedWithLocations.length}`);
    console.log(`   ❌ Without locations: ${approvedWithoutLocations.length}`);
    
    // Show approved residents with locations
    if (approvedWithLocations.length > 0) {
      console.log('\n📍 Approved residents WITH locations (ready for collection):');
      approvedWithLocations.forEach((resident, index) => {
        console.log(`   ${index + 1}. ✅ ${resident.username} (${resident.full_name || 'N/A'})`);
        console.log(`      📍 Location: ${resident.latitude}, ${resident.longitude}`);
        console.log(`      🏠 Address: ${resident.full_address}`);
        console.log(`      🏘️ Barangay: ${resident.barangay_name}`);
        console.log(`      📅 Added: ${resident.captured_at ? new Date(resident.captured_at).toLocaleDateString() : 'N/A'}`);
        console.log(`      🔧 Source: ${resident.source || 'N/A'}`);
        console.log('');
      });
    }
    
    // Show approved residents without locations (problems for collection)
    if (approvedWithoutLocations.length > 0) {
      console.log('\n❌ Approved residents WITHOUT locations (collection issues):');
      approvedWithoutLocations.forEach((resident, index) => {
        console.log(`   ${index + 1}. ❌ ${resident.username} (${resident.full_name || 'N/A'})`);
        console.log(`      🏠 Address: ${resident.full_address}`);
        console.log(`      🏘️ Barangay: ${resident.barangay_name}`);
        console.log('');
      });
    }
    
    // Check subscription status for approved residents
    console.log('\n💳 Checking subscription status for collection eligibility...');
    const subscriptionQuery = `
      SELECT u.user_id, u.username,
             cs.status as subscription_status,
             cs.created_at as subscription_date,
             sp.plan_name,
             sp.price
      FROM users u
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE u.role_id = 3 AND u.approval_status = 'approved'
      ORDER BY u.user_id
    `;
    
    const subscriptionResult = await pool.query(subscriptionQuery);
    const withSubscriptions = subscriptionResult.rows.filter(r => r.subscription_status);
    const withoutSubscriptions = subscriptionResult.rows.filter(r => !r.subscription_status);
    
    console.log(`   ✅ With subscriptions: ${withSubscriptions.length}`);
    console.log(`   ❌ Without subscriptions: ${withoutSubscriptions.length}`);
    
    // Final collection readiness assessment
    console.log('\n🚛 COLLECTION READINESS ASSESSMENT:');
    
    const readyForCollection = approved.filter(r => {
      const hasLocation = r.latitude;
      const hasSubscription = subscriptionResult.rows.find(s => s.user_id === r.user_id && s.subscription_status);
      return hasLocation && hasSubscription;
    });
    
    const notReadyReasons = approved.filter(r => {
      const hasLocation = r.latitude;
      const hasSubscription = subscriptionResult.rows.find(s => s.user_id === r.user_id && s.subscription_status);
      return !hasLocation || !hasSubscription;
    });
    
    console.log(`   🎯 READY for collection: ${readyForCollection.length} residents`);
    console.log(`   ⚠️ NOT READY for collection: ${notReadyReasons.length} residents`);
    
    if (readyForCollection.length > 0) {
      console.log('\n✅ Residents READY for regular collection:');
      readyForCollection.forEach((resident, index) => {
        const subscription = subscriptionResult.rows.find(s => s.user_id === resident.user_id);
        console.log(`   ${index + 1}. ${resident.username} (${resident.full_name || 'N/A'})`);
        console.log(`      📍 Location: ${resident.latitude}, ${resident.longitude}`);
        console.log(`      💳 Plan: ${subscription?.plan_name || 'N/A'} (${subscription?.subscription_status})`);
        console.log(`      🏠 Address: ${resident.full_address}`);
        console.log('');
      });
    }
    
    if (notReadyReasons.length > 0) {
      console.log('\n⚠️ Residents NOT READY for collection (missing requirements):');
      notReadyReasons.forEach((resident, index) => {
        const hasLocation = resident.latitude;
        const subscription = subscriptionResult.rows.find(s => s.user_id === resident.user_id);
        const hasSubscription = subscription?.subscription_status;
        
        console.log(`   ${index + 1}. ${resident.username} (${resident.full_name || 'N/A'})`);
        console.log(`      📍 Location: ${hasLocation ? '✅ Yes' : '❌ Missing'}`);
        console.log(`      💳 Subscription: ${hasSubscription ? '✅ ' + subscription.subscription_status : '❌ Missing'}`);
        console.log(`      🏠 Address: ${resident.full_address}`);
        console.log('');
      });
    }
    
    // Summary
    console.log('📈 SUMMARY FOR REGULAR COLLECTION:');
    console.log(`   👥 Total approved residents: ${approved.length}`);
    console.log(`   📍 With locations: ${approvedWithLocations.length} (${((approvedWithLocations.length/approved.length)*100).toFixed(1)}%)`);
    console.log(`   💳 With subscriptions: ${withSubscriptions.length} (${((withSubscriptions.length/approved.length)*100).toFixed(1)}%)`);
    console.log(`   🚛 Ready for collection: ${readyForCollection.length} (${((readyForCollection.length/approved.length)*100).toFixed(1)}%)`);
    
    if (readyForCollection.length === approved.length) {
      console.log('\n🎉 PERFECT! All approved residents are ready for regular collection!');
    } else {
      console.log(`\n⚠️ ${notReadyReasons.length} residents need attention before they can be collected.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

verifyAllResidentsLocations();
