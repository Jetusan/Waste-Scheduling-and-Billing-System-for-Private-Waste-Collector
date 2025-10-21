/**
 * Check the collector_barangay_assignments table structure and data
 */

const pool = require('./config/dbAdmin');

async function checkBarangayAssignments() {
  console.log('🔍 Checking collector_barangay_assignments table...\n');
  
  try {
    // Check table structure
    console.log('📋 Table structure:');
    const schema = await pool.queryWithRetry(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'collector_barangay_assignments' 
      ORDER BY ordinal_position
    `);
    schema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check current data
    console.log('\n📊 Current assignments:');
    const data = await pool.queryWithRetry(`
      SELECT cba.*, c.user_id, u.email, b.barangay_name
      FROM collector_barangay_assignments cba
      JOIN collectors c ON cba.collector_id = c.collector_id
      JOIN users u ON c.user_id = u.user_id
      JOIN barangays b ON cba.barangay_id = b.barangay_id
      ORDER BY cba.collector_id, b.barangay_name
    `);
    
    console.log(`Found ${data.rows.length} total assignments:`);
    data.rows.forEach(row => {
      console.log(`  Collector ${row.collector_id} (${row.email}) → ${row.barangay_name} (ID: ${row.barangay_id})`);
      console.log(`    Assignment ID: ${row.assignment_id}, Created: ${row.created_at}`);
    });

    // Check today's collections for comparison
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      timeZone: 'Asia/Manila' 
    });
    
    console.log(`\n📅 Collection schedules for ${today}:`);
    const schedules = await pool.queryWithRetry(`
      SELECT cs.*, b.barangay_name
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      WHERE LOWER(cs.schedule_date) = LOWER($1)
      ORDER BY b.barangay_name
    `, [today]);
    
    console.log(`Found ${schedules.rows.length} schedules:`);
    schedules.rows.forEach(schedule => {
      console.log(`  ${schedule.barangay_name}: ${schedule.waste_type} (${schedule.time_range})`);
    });

    // Find the mismatch
    console.log(`\n🔍 Analysis:`);
    const assignedBarangays = [...new Set(data.rows.map(r => r.barangay_id))];
    const scheduledBarangays = [...new Set(schedules.rows.map(r => r.barangay_id))];
    
    console.log(`Assigned barangays: ${assignedBarangays.length}`);
    console.log(`Scheduled barangays for ${today}: ${scheduledBarangays.length}`);
    
    const assignedButNotScheduled = assignedBarangays.filter(id => !scheduledBarangays.includes(id));
    const scheduledButNotAssigned = scheduledBarangays.filter(id => !assignedBarangays.includes(id));
    
    if (assignedButNotScheduled.length > 0) {
      console.log(`\n❌ Barangays assigned to collectors but NO schedule for ${today}:`);
      assignedButNotScheduled.forEach(barangayId => {
        const barangayName = data.rows.find(r => r.barangay_id === barangayId)?.barangay_name;
        const collectors = data.rows.filter(r => r.barangay_id === barangayId).map(r => `${r.collector_id} (${r.email})`);
        console.log(`  ${barangayName} (ID: ${barangayId}) - Assigned to: ${collectors.join(', ')}`);
      });
      console.log(`\n💡 SOLUTION: Create collection schedules for ${today} for these barangays!`);
    }
    
    if (scheduledButNotAssigned.length > 0) {
      console.log(`\n⚠️ Barangays with ${today} schedule but NO collector assigned:`);
      scheduledButNotAssigned.forEach(barangayId => {
        const barangayName = schedules.rows.find(r => r.barangay_id === barangayId)?.barangay_name;
        console.log(`  ${barangayName} (ID: ${barangayId})`);
      });
    }
    
    if (assignedButNotScheduled.length === 0 && scheduledButNotAssigned.length === 0) {
      console.log(`✅ All assigned barangays have schedules for ${today}!`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkBarangayAssignments().then(() => {
  console.log('\n✅ Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
