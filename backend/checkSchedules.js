const pool = require('./config/dbAdmin');

(async () => {
  console.log('🔍 Checking what collection schedules exist in database...');
  
  try {
    // Check all collection schedules
    const allSchedules = await pool.queryWithRetry('SELECT * FROM collection_schedules ORDER BY schedule_id');
    console.log('📋 All collection schedules:');
    allSchedules.rows.forEach(s => {
      console.log(`  ID: ${s.schedule_id}, Date: '${s.schedule_date}', Waste: ${s.waste_type}, Time: ${s.time_range}`);
    });
    
    // Check schedule_barangays table
    const scheduleBarangays = await pool.queryWithRetry(`
      SELECT sb.*, cs.schedule_date, cs.waste_type, b.barangay_name 
      FROM schedule_barangays sb
      JOIN collection_schedules cs ON sb.schedule_id = cs.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      ORDER BY sb.schedule_id
    `);
    console.log('\n🏘️ Schedule-Barangay assignments:');
    scheduleBarangays.rows.forEach(sb => {
      console.log(`  Schedule ${sb.schedule_id} (${sb.schedule_date}) -> ${sb.barangay_name} (ID: ${sb.barangay_id})`);
    });
    
    // Check barangays table
    const barangays = await pool.queryWithRetry('SELECT * FROM barangays ORDER BY barangay_id');
    console.log('\n🏘️ All barangays:');
    barangays.rows.forEach(b => {
      console.log(`  ID: ${b.barangay_id}, Name: '${b.barangay_name}'`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
})();
