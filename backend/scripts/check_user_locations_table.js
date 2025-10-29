const pool = require('../config/db');

async function checkUserLocationsTable() {
  try {
    console.log('🔍 Checking user_locations table - the basis for collection map...\n');
    
    // First, check the table structure
    console.log('📋 user_locations table structure:');
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_locations' 
      ORDER BY ordinal_position
    `;
    const structureResult = await pool.query(structureQuery);
    structureResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check all records in user_locations table
    console.log('\n📍 ALL records in user_locations table:');
    const allLocationsQuery = `
      SELECT ul.location_id, ul.user_id, ul.kind, ul.latitude, ul.longitude, 
             ul.accuracy_m, ul.source, ul.captured_at, ul.is_current,
             u.username, u.role_id, u.approval_status,
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name
      FROM user_locations ul
      LEFT JOIN users u ON ul.user_id = u.user_id
      LEFT JOIN user_names n ON u.name_id = n.name_id
      ORDER BY ul.user_id, ul.captured_at DESC
    `;
    
    const allResult = await pool.query(allLocationsQuery);
    console.log(`Total records in user_locations: ${allResult.rows.length}`);
    
    allResult.rows.forEach((loc, index) => {
      const roleText = loc.role_id === 3 ? 'RESIDENT' : loc.role_id === 2 ? 'COLLECTOR' : loc.role_id === 1 ? 'ADMIN' : 'UNKNOWN';
      console.log(`   ${index + 1}. Location ID: ${loc.location_id}`);
      console.log(`      User: ${loc.username} (${loc.full_name || 'N/A'}) - ${roleText}`);
      console.log(`      Role ID: ${loc.role_id}, Status: ${loc.approval_status}`);
      console.log(`      Kind: ${loc.kind}, Current: ${loc.is_current}`);
      console.log(`      Coordinates: ${loc.latitude}, ${loc.longitude}`);
      console.log(`      Source: ${loc.source}, Date: ${new Date(loc.captured_at).toLocaleString()}`);
      console.log('');
    });
    
    // Focus on RESIDENTS (role_id = 3) with current home locations
    console.log('\n🏠 RESIDENTS (role_id = 3) with CURRENT HOME locations:');
    const residentsQuery = `
      SELECT ul.location_id, ul.user_id, ul.latitude, ul.longitude, 
             ul.source, ul.captured_at,
             u.username, u.approval_status,
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name
      FROM user_locations ul
      JOIN users u ON ul.user_id = u.user_id
      LEFT JOIN user_names n ON u.name_id = n.name_id
      WHERE u.role_id = 3 
        AND ul.kind = 'home' 
        AND ul.is_current = true
      ORDER BY ul.user_id
    `;
    
    const residentsResult = await pool.query(residentsQuery);
    console.log(`Residents with current home locations: ${residentsResult.rows.length}`);
    
    residentsResult.rows.forEach((resident, index) => {
      console.log(`   ${index + 1}. ${resident.username} (${resident.full_name || 'N/A'})`);
      console.log(`      Status: ${resident.approval_status}`);
      console.log(`      📍 Coordinates: ${resident.latitude}, ${resident.longitude}`);
      console.log(`      🔧 Source: ${resident.source}`);
      console.log(`      📅 Added: ${new Date(resident.captured_at).toLocaleString()}`);
      console.log('');
    });
    
    // Check which approved residents are MISSING from user_locations
    console.log('\n❌ APPROVED residents MISSING from user_locations table:');
    const missingQuery = `
      SELECT u.user_id, u.username, u.approval_status,
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN user_locations ul ON u.user_id = ul.user_id AND ul.kind = 'home' AND ul.is_current = true
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND ul.user_id IS NULL
      ORDER BY u.user_id
    `;
    
    const missingResult = await pool.query(missingQuery);
    if (missingResult.rows.length > 0) {
      console.log(`Found ${missingResult.rows.length} approved residents missing locations:`);
      missingResult.rows.forEach((resident, index) => {
        console.log(`   ${index + 1}. ❌ ${resident.username} (${resident.full_name || 'N/A'})`);
        console.log(`      User ID: ${resident.user_id}`);
        console.log('');
      });
    } else {
      console.log('✅ All approved residents have locations in user_locations table!');
    }
    
    // Summary for collection system
    console.log('\n📊 COLLECTION SYSTEM SUMMARY:');
    const approvedResidents = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE role_id = 3 AND approval_status = 'approved'
    `);
    
    const approvedWithLocations = residentsResult.rows.filter(r => 
      allResult.rows.find(a => a.user_id === r.user_id && a.approval_status === 'approved')
    ).length;
    
    console.log(`   👥 Total approved residents: ${approvedResidents.rows[0].count}`);
    console.log(`   📍 With locations in user_locations: ${residentsResult.rows.length}`);
    console.log(`   🚛 Ready for collection map: ${residentsResult.rows.length}`);
    
    if (residentsResult.rows.length === parseInt(approvedResidents.rows[0].count)) {
      console.log('\n🎉 PERFECT! All approved residents have locations in user_locations table!');
      console.log('✅ Collection system can show all residents on the map!');
    } else {
      console.log(`\n⚠️ ${parseInt(approvedResidents.rows[0].count) - residentsResult.rows.length} approved residents are missing from user_locations!`);
      console.log('❌ Collection system will not show these residents on the map!');
    }
    
    // Check for duplicate locations
    console.log('\n🔍 Checking for duplicate locations...');
    const duplicateQuery = `
      SELECT user_id, COUNT(*) as count
      FROM user_locations 
      WHERE kind = 'home' AND is_current = true
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery);
    if (duplicateResult.rows.length > 0) {
      console.log(`⚠️ Found ${duplicateResult.rows.length} users with multiple current home locations:`);
      duplicateResult.rows.forEach(dup => {
        console.log(`   - User ID ${dup.user_id}: ${dup.count} current home locations`);
      });
    } else {
      console.log('✅ No duplicate current home locations found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

checkUserLocationsTable();
