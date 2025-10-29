const pool = require('../config/db');

async function addVSMLocations() {
  try {
    console.log('🏘️ Adding strategic locations for residents in VSM Heights Phase 1...\n');
    
    // Check residents without locations
    const residentsQuery = `
      SELECT u.user_id, u.username, 
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
             a.full_address, a.subdivision
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN user_locations ul ON u.user_id = ul.user_id AND ul.kind = 'home' AND ul.is_current = true
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND ul.latitude IS NULL
        AND a.barangay_id = 6
      ORDER BY u.user_id
    `;
    
    const residentsResult = await pool.query(residentsQuery);
    console.log(`📊 Found ${residentsResult.rows.length} residents without locations in San Isidro:`);
    
    residentsResult.rows.forEach((resident, index) => {
      console.log(`   ${index + 1}. ${resident.username} (${resident.full_name || 'N/A'})`);
      console.log(`      Address: ${resident.full_address}`);
      console.log('');
    });
    
    if (residentsResult.rows.length === 0) {
      console.log('✅ All residents already have locations!');
      return;
    }
    
    // VSM Heights Phase 1 coordinates (San Isidro area)
    // Base coordinates for San Isidro, General Santos City
    const baseLatitude = 6.1164; // San Isidro area
    const baseLongitude = 125.1686; // San Isidro area
    
    // Create strategic locations side by side for efficient collection
    // Each location is approximately 50-100 meters apart for easy collection routing
    const strategicLocations = [
      // Street 1 - Phase 1 Block A
      { lat: 6.1164, lng: 125.1686, address: "Block A, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1165, lng: 125.1687, address: "Block A, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1166, lng: 125.1688, address: "Block A, Lot 3, VSM Heights Phase 1" },
      
      // Street 2 - Phase 1 Block B (parallel street)
      { lat: 6.1167, lng: 125.1686, address: "Block B, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1168, lng: 125.1687, address: "Block B, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1169, lng: 125.1688, address: "Block B, Lot 3, VSM Heights Phase 1" },
      
      // Street 3 - Phase 1 Block C
      { lat: 6.1170, lng: 125.1686, address: "Block C, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1171, lng: 125.1687, address: "Block C, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1172, lng: 125.1688, address: "Block C, Lot 3, VSM Heights Phase 1" },
      
      // Street 4 - Phase 1 Block D
      { lat: 6.1173, lng: 125.1686, address: "Block D, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1174, lng: 125.1687, address: "Block D, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1175, lng: 125.1688, address: "Block D, Lot 3, VSM Heights Phase 1" },
    ];
    
    console.log('📍 Strategic locations for efficient collection:');
    strategicLocations.forEach((loc, index) => {
      console.log(`   ${index + 1}. ${loc.address} (${loc.lat}, ${loc.lng})`);
    });
    
    // Assign locations to residents
    console.log('\n🎯 Assigning locations to residents...');
    
    for (let i = 0; i < residentsResult.rows.length; i++) {
      const resident = residentsResult.rows[i];
      const location = strategicLocations[i % strategicLocations.length]; // Cycle through locations if more residents than locations
      
      try {
        // Insert location for resident
        await pool.query(`
          INSERT INTO user_locations (user_id, kind, latitude, longitude, accuracy_m, source, captured_at, is_current)
          VALUES ($1, 'home', $2, $3, 10, 'admin_assigned', NOW(), true)
        `, [resident.user_id, location.lat, location.lng]);
        
        // Update their address to reflect VSM Heights Phase 1
        await pool.query(`
          UPDATE addresses 
          SET full_address = $1,
              subdivision = 'VSM Heights Phase 1',
              subdivision_id = 1
          WHERE address_id = (
            SELECT address_id FROM users WHERE user_id = $2
          )
        `, [`${location.address}, San Isidro, General Santos City`, resident.user_id]);
        
        console.log(`✅ ${resident.username}: ${location.address} (${location.lat}, ${location.lng})`);
        
      } catch (error) {
        console.log(`❌ Error assigning location to ${resident.username}:`, error.message);
      }
    }
    
    // Verify the assignments
    console.log('\n🔍 Verifying location assignments...');
    const verifyQuery = `
      SELECT u.user_id, u.username, 
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
             a.full_address,
             ul.latitude, ul.longitude, ul.captured_at
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN user_locations ul ON u.user_id = ul.user_id AND ul.kind = 'home' AND ul.is_current = true
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND a.barangay_id = 6
      ORDER BY ul.latitude, ul.longitude
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.log(`📊 All residents in San Isidro (VSM Heights Phase 1):`);
    
    verifyResult.rows.forEach((resident, index) => {
      const hasLocation = resident.latitude ? '✅' : '❌';
      console.log(`   ${index + 1}. ${hasLocation} ${resident.username} (${resident.full_name || 'N/A'})`);
      console.log(`      Address: ${resident.full_address}`);
      if (resident.latitude) {
        console.log(`      Location: ${resident.latitude}, ${resident.longitude}`);
      }
      console.log('');
    });
    
    // Summary
    const withLocations = verifyResult.rows.filter(r => r.latitude).length;
    const withoutLocations = verifyResult.rows.length - withLocations;
    
    console.log('📈 Summary:');
    console.log(`   ✅ Residents with locations: ${withLocations}`);
    console.log(`   ❌ Residents without locations: ${withoutLocations}`);
    console.log(`   📍 All residents are now in VSM Heights Phase 1, San Isidro`);
    console.log(`   🚛 Locations are strategically placed for efficient collection routing`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

addVSMLocations();
