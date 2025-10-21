/**
 * Diagnose Barangay Assignment vs Collection Issue
 * Check if the newly added barangay has assignments but no collections
 */

const pool = require('./config/dbAdmin');

async function diagnoseBarangayIssue() {
  console.log('🔍 Diagnosing Barangay Assignment vs Collection Issue...\n');
  
  try {
    // Step 1: Get all collectors and their barangay assignments
    console.log('📋 Step 1: Checking collector barangay assignments...');
    const assignmentsQuery = `
      SELECT DISTINCT
        c.collector_id,
        c.user_id as collector_user_id,
        u.email as collector_email,
        cba.barangay_id,
        b.barangay_name,
        cba.assignment_id,
        cba.created_at as assigned_at,
        cba.status
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      JOIN collector_barangay_assignments cba ON c.collector_id = cba.collector_id
      JOIN barangays b ON cba.barangay_id = b.barangay_id
      WHERE cba.status = 'active'
      ORDER BY c.collector_id, b.barangay_name
    `;
    
    const assignmentsResult = await pool.queryWithRetry(assignmentsQuery);
    console.log(`Found ${assignmentsResult.rows.length} active collector-barangay assignments:`);
    
    const collectorAssignments = {};
    assignmentsResult.rows.forEach(assignment => {
      if (!collectorAssignments[assignment.collector_id]) {
        collectorAssignments[assignment.collector_id] = {
          email: assignment.collector_email,
          barangays: []
        };
      }
      collectorAssignments[assignment.collector_id].barangays.push({
        barangay_id: assignment.barangay_id,
        barangay_name: assignment.barangay_name,
        assigned_at: assignment.assigned_at
      });
    });
    
    Object.keys(collectorAssignments).forEach(collectorId => {
      const collector = collectorAssignments[collectorId];
      console.log(`\n  Collector ${collectorId} (${collector.email}):`);
      collector.barangays.forEach(b => {
        console.log(`    - ${b.barangay_name} (ID: ${b.barangay_id})`);
      });
    });

    // Step 2: Check collection schedules for today
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      timeZone: 'Asia/Manila' 
    });
    
    console.log(`\n📅 Step 2: Checking collection schedules for ${today}...`);
    const schedulesQuery = `
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
      ORDER BY b.barangay_name
    `;
    
    const schedulesResult = await pool.queryWithRetry(schedulesQuery, [today]);
    console.log(`Found ${schedulesResult.rows.length} collection schedules for ${today}:`);
    
    const scheduledBarangays = {};
    schedulesResult.rows.forEach(schedule => {
      if (!scheduledBarangays[schedule.barangay_id]) {
        scheduledBarangays[schedule.barangay_id] = {
          barangay_name: schedule.barangay_name,
          schedules: []
        };
      }
      scheduledBarangays[schedule.barangay_id].schedules.push({
        waste_type: schedule.waste_type,
        time_range: schedule.time_range
      });
    });
    
    Object.keys(scheduledBarangays).forEach(barangayId => {
      const barangay = scheduledBarangays[barangayId];
      console.log(`  ${barangay.barangay_name} (ID: ${barangayId}):`);
      barangay.schedules.forEach(s => {
        console.log(`    - ${s.waste_type} (${s.time_range})`);
      });
    });

    // Step 3: Check residents with active subscriptions per barangay
    console.log(`\n👥 Step 3: Checking residents with active subscriptions...`);
    const residentsQuery = `
      SELECT 
        b.barangay_id,
        b.barangay_name,
        COUNT(DISTINCT u.user_id) as resident_count
      FROM barangays b
      LEFT JOIN addresses a ON b.barangay_id = a.barangay_id
      LEFT JOIN users u ON a.address_id = u.address_id
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND cs.status IN ('active', 'pending_payment')
        AND cs.created_at = (
          SELECT MAX(cs2.created_at) 
          FROM customer_subscriptions cs2 
          WHERE cs2.user_id = u.user_id
        )
      GROUP BY b.barangay_id, b.barangay_name
      HAVING COUNT(DISTINCT u.user_id) > 0
      ORDER BY b.barangay_name
    `;
    
    const residentsResult = await pool.queryWithRetry(residentsQuery);
    console.log(`Found residents with active subscriptions in ${residentsResult.rows.length} barangays:`);
    
    const barangaysWithResidents = {};
    residentsResult.rows.forEach(row => {
      barangaysWithResidents[row.barangay_id] = {
        barangay_name: row.barangay_name,
        resident_count: parseInt(row.resident_count)
      };
      console.log(`  ${row.barangay_name} (ID: ${row.barangay_id}): ${row.resident_count} residents`);
    });

    // Step 4: Analysis - Find mismatches
    console.log(`\n🔍 Step 4: Analysis - Finding issues...\n`);
    
    let issuesFound = 0;
    
    // Check each collector's assignments
    Object.keys(collectorAssignments).forEach(collectorId => {
      const collector = collectorAssignments[collectorId];
      console.log(`📊 Collector ${collectorId} (${collector.email}) Analysis:`);
      
      collector.barangays.forEach(barangay => {
        const barangayId = barangay.barangay_id;
        const barangayName = barangay.barangay_name;
        
        const hasSchedule = scheduledBarangays[barangayId];
        const hasResidents = barangaysWithResidents[barangayId];
        
        let status = '✅ GOOD';
        let issues = [];
        
        if (!hasSchedule) {
          issues.push(`No collection schedule for ${today}`);
          status = '❌ ISSUE';
          issuesFound++;
        }
        
        if (!hasResidents) {
          issues.push('No residents with active subscriptions');
          status = '❌ ISSUE';
          issuesFound++;
        }
        
        console.log(`  ${status} ${barangayName} (ID: ${barangayId})`);
        if (issues.length > 0) {
          issues.forEach(issue => console.log(`    - ${issue}`));
        } else {
          console.log(`    - Has schedule: ${hasSchedule.schedules.length} schedules`);
          console.log(`    - Has residents: ${hasResidents.resident_count} residents`);
        }
      });
      console.log('');
    });

    // Step 5: Recommendations
    console.log('💡 RECOMMENDATIONS:\n');
    
    if (issuesFound === 0) {
      console.log('✅ No issues found! All assigned barangays have schedules and residents.');
    } else {
      console.log(`❌ Found ${issuesFound} issues. Here's how to fix them:\n`);
      
      console.log('🔧 For "No collection schedule" issues:');
      console.log('   1. Go to Admin → Collection Schedules');
      console.log(`   2. Create a schedule for ${today}`);
      console.log('   3. Assign the problematic barangay to that schedule\n');
      
      console.log('🔧 For "No residents with active subscriptions" issues:');
      console.log('   1. Check if residents exist in that barangay');
      console.log('   2. Verify residents have active subscriptions');
      console.log('   3. Check if residents are approved users\n');
      
      console.log('🔧 For dynamic assignment issues:');
      console.log('   1. The assignment system IS dynamic');
      console.log('   2. But collections require BOTH assignment AND schedule');
      console.log('   3. Make sure both are set up correctly');
    }

    // Step 6: Quick fix suggestions
    console.log('\n🚀 QUICK FIXES:\n');
    
    // Find barangays with assignments but no schedules
    const assignedBarangayIds = new Set();
    Object.values(collectorAssignments).forEach(collector => {
      collector.barangays.forEach(b => assignedBarangayIds.add(b.barangay_id));
    });
    
    const missingSchedules = Array.from(assignedBarangayIds).filter(id => !scheduledBarangays[id]);
    if (missingSchedules.length > 0) {
      console.log(`📅 Create ${today} schedules for these assigned barangays:`);
      missingSchedules.forEach(barangayId => {
        const barangayName = Object.values(collectorAssignments)
          .flatMap(c => c.barangays)
          .find(b => b.barangay_id == barangayId)?.barangay_name || 'Unknown';
        console.log(`   - ${barangayName} (ID: ${barangayId})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run the diagnosis
diagnoseBarangayIssue().then(() => {
  console.log('\n✅ Diagnosis completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Diagnosis failed:', error);
  process.exit(1);
});
