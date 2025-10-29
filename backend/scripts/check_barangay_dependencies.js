const pool = require('../config/db');

async function checkBarangayDependencies() {
  try {
    console.log('🔍 Checking barangay data and dependencies...\n');
    
    // Get all barangays
    const barangayQuery = 'SELECT barangay_id, barangay_name FROM barangays ORDER BY barangay_name';
    const barangayResult = await pool.query(barangayQuery);
    
    console.log('📍 Current barangays:');
    barangayResult.rows.forEach(b => {
      console.log(`   - ${b.barangay_name} (ID: ${b.barangay_id})`);
    });
    
    // Find San Isidro
    const sanIsidro = barangayResult.rows.find(b => b.barangay_name === 'San Isidro');
    if (sanIsidro) {
      console.log(`\n✅ San Isidro found: ID ${sanIsidro.barangay_id}`);
    } else {
      console.log('\n❌ San Isidro not found!');
      return;
    }
    
    // Check dependencies - addresses table
    console.log('\n🔗 Checking dependencies in addresses table:');
    const addressQuery = `
      SELECT b.barangay_name, COUNT(a.address_id) as address_count
      FROM barangays b
      LEFT JOIN addresses a ON b.barangay_id = a.barangay_id
      GROUP BY b.barangay_id, b.barangay_name
      HAVING COUNT(a.address_id) > 0
      ORDER BY b.barangay_name
    `;
    const addressResult = await pool.query(addressQuery);
    
    if (addressResult.rows.length > 0) {
      console.log('   Barangays with addresses:');
      addressResult.rows.forEach(row => {
        console.log(`   - ${row.barangay_name}: ${row.address_count} addresses`);
      });
    } else {
      console.log('   No addresses found using barangays');
    }
    
    // Check collection schedules
    console.log('\n📅 Checking dependencies in collection_schedules:');
    const scheduleQuery = `
      SELECT b.barangay_name, COUNT(cs.schedule_id) as schedule_count
      FROM barangays b
      LEFT JOIN schedule_barangays sb ON b.barangay_id = sb.barangay_id
      LEFT JOIN collection_schedules cs ON sb.schedule_id = cs.schedule_id
      GROUP BY b.barangay_id, b.barangay_name
      HAVING COUNT(cs.schedule_id) > 0
      ORDER BY b.barangay_name
    `;
    const scheduleResult = await pool.query(scheduleQuery);
    
    if (scheduleResult.rows.length > 0) {
      console.log('   Barangays with collection schedules:');
      scheduleResult.rows.forEach(row => {
        console.log(`   - ${row.barangay_name}: ${row.schedule_count} schedules`);
      });
    } else {
      console.log('   No collection schedules found using barangays');
    }
    
    // Check users with addresses in these barangays
    console.log('\n👥 Checking users by barangay:');
    const userQuery = `
      SELECT b.barangay_name, COUNT(u.user_id) as user_count
      FROM barangays b
      LEFT JOIN addresses a ON b.barangay_id = a.barangay_id
      LEFT JOIN users u ON a.address_id = u.address_id
      GROUP BY b.barangay_id, b.barangay_name
      HAVING COUNT(u.user_id) > 0
      ORDER BY b.barangay_name
    `;
    const userResult = await pool.query(userQuery);
    
    if (userResult.rows.length > 0) {
      console.log('   Barangays with users:');
      userResult.rows.forEach(row => {
        console.log(`   - ${row.barangay_name}: ${row.user_count} users`);
      });
    } else {
      console.log('   No users found in barangays');
    }
    
    // List barangays that can be safely deleted (no dependencies)
    const usedBarangayNames = new Set([
      ...addressResult.rows.map(r => r.barangay_name),
      ...scheduleResult.rows.map(r => r.barangay_name),
      ...userResult.rows.map(r => r.barangay_name)
    ]);
    
    const safeToDelete = barangayResult.rows.filter(b => 
      b.barangay_name !== 'San Isidro' && !usedBarangayNames.has(b.barangay_name)
    );
    
    console.log(`\n🗑️ Barangays safe to delete (${safeToDelete.length}):`);
    safeToDelete.forEach(b => {
      console.log(`   - ${b.barangay_name} (ID: ${b.barangay_id})`);
    });
    
    const needsHandling = barangayResult.rows.filter(b => 
      b.barangay_name !== 'San Isidro' && usedBarangayNames.has(b.barangay_name)
    );
    
    console.log(`\n⚠️ Barangays with dependencies (${needsHandling.length}):`);
    needsHandling.forEach(b => {
      console.log(`   - ${b.barangay_name} (ID: ${b.barangay_id}) - has dependencies`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkBarangayDependencies();
