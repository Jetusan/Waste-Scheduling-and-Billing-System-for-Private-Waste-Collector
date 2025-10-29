const { Pool } = require('pg');

// Direct connection to Neon database
const neonPool = new Pool({
  host: 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

async function addVSMLocationsToNeon() {
  try {
    console.log('🏘️ Adding strategic VSM Heights Phase 1 locations to Neon database...\n');
    
    // First, update all addresses to San Isidro barangay in Neon
    console.log('🔄 Step 1: Updating all addresses to San Isidro barangay...');
    
    // Find San Isidro barangay ID in Neon
    const sanIsidroQuery = 'SELECT barangay_id, barangay_name FROM barangays WHERE barangay_name = $1';
    const sanIsidroResult = await neonPool.query(sanIsidroQuery, ['San Isidro']);
    
    if (sanIsidroResult.rows.length === 0) {
      console.log('❌ San Isidro barangay not found in Neon! Creating it...');
      const createBarangayQuery = `
        INSERT INTO barangays (barangay_name) 
        VALUES ('San Isidro') 
        RETURNING barangay_id, barangay_name
      `;
      const createResult = await neonPool.query(createBarangayQuery);
      console.log(`✅ Created San Isidro barangay: ID ${createResult.rows[0].barangay_id}`);
    }
    
    const sanIsidroId = sanIsidroResult.rows.length > 0 ? sanIsidroResult.rows[0].barangay_id : 6; // Default to 6 if not found
    console.log(`✅ San Isidro barangay ID: ${sanIsidroId}`);
    
    // Update all addresses to San Isidro
    const updateAddressesQuery = `
      UPDATE addresses 
      SET barangay_id = $1,
          full_address = REGEXP_REPLACE(
            full_address, 
            ', [^,]+, General Santos City$', 
            ', San Isidro, General Santos City'
          )
      WHERE barangay_id != $1 OR barangay_id IS NULL
    `;
    const updateResult = await neonPool.query(updateAddressesQuery, [sanIsidroId]);
    console.log(`✅ Updated ${updateResult.rowCount} addresses to San Isidro`);
    
    // Get residents without locations in Neon
    console.log('\n🔍 Step 2: Finding residents without locations...');
    const residentsQuery = `
      SELECT u.user_id, u.username, 
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
             a.full_address
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN user_locations ul ON u.user_id = ul.user_id AND ul.kind = 'home' AND ul.is_current = true
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND ul.latitude IS NULL
      ORDER BY u.user_id
    `;
    
    const residentsResult = await neonPool.query(residentsQuery);
    console.log(`📊 Found ${residentsResult.rows.length} residents without locations in Neon:`);
    
    residentsResult.rows.forEach((resident, index) => {
      console.log(`   ${index + 1}. ${resident.username} (${resident.full_name || 'N/A'})`);
    });
    
    if (residentsResult.rows.length === 0) {
      console.log('✅ All residents already have locations in Neon!');
      return;
    }
    
    // VSM Heights Phase 1 strategic coordinates (San Isidro area)
    console.log('\n📍 Step 3: Creating strategic locations for efficient collection...');
    const strategicLocations = [
      // Street 1 - Phase 1 Block A
      { lat: 6.1164, lng: 125.1686, address: "Block A, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1165, lng: 125.1687, address: "Block A, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1166, lng: 125.1688, address: "Block A, Lot 3, VSM Heights Phase 1" },
      { lat: 6.1167, lng: 125.1689, address: "Block A, Lot 4, VSM Heights Phase 1" },
      
      // Street 2 - Phase 1 Block B (parallel street)
      { lat: 6.1168, lng: 125.1686, address: "Block B, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1169, lng: 125.1687, address: "Block B, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1170, lng: 125.1688, address: "Block B, Lot 3, VSM Heights Phase 1" },
      { lat: 6.1171, lng: 125.1689, address: "Block B, Lot 4, VSM Heights Phase 1" },
      
      // Street 3 - Phase 1 Block C
      { lat: 6.1172, lng: 125.1686, address: "Block C, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1173, lng: 125.1687, address: "Block C, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1174, lng: 125.1688, address: "Block C, Lot 3, VSM Heights Phase 1" },
      { lat: 6.1175, lng: 125.1689, address: "Block C, Lot 4, VSM Heights Phase 1" },
      
      // Street 4 - Phase 1 Block D
      { lat: 6.1176, lng: 125.1686, address: "Block D, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1177, lng: 125.1687, address: "Block D, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1178, lng: 125.1688, address: "Block D, Lot 3, VSM Heights Phase 1" },
      { lat: 6.1179, lng: 125.1689, address: "Block D, Lot 4, VSM Heights Phase 1" },
      
      // Additional locations if needed
      { lat: 6.1180, lng: 125.1686, address: "Block E, Lot 1, VSM Heights Phase 1" },
      { lat: 6.1181, lng: 125.1687, address: "Block E, Lot 2, VSM Heights Phase 1" },
      { lat: 6.1182, lng: 125.1688, address: "Block E, Lot 3, VSM Heights Phase 1" },
      { lat: 6.1183, lng: 125.1689, address: "Block E, Lot 4, VSM Heights Phase 1" },
    ];
    
    console.log('📍 Strategic locations for efficient collection:');
    strategicLocations.slice(0, residentsResult.rows.length).forEach((loc, index) => {
      console.log(`   ${index + 1}. ${loc.address} (${loc.lat}, ${loc.lng})`);
    });
    
    // Assign locations to residents
    console.log('\n🎯 Step 4: Assigning locations to residents in Neon...');
    
    for (let i = 0; i < residentsResult.rows.length; i++) {
      const resident = residentsResult.rows[i];
      const location = strategicLocations[i % strategicLocations.length]; // Cycle through locations if more residents than locations
      
      try {
        // Mark any existing locations as not current
        await neonPool.query(`
          UPDATE user_locations 
          SET is_current = false 
          WHERE user_id = $1 AND kind = 'home' AND is_current = true
        `, [resident.user_id]);
        
        // Insert new location for resident
        await neonPool.query(`
          INSERT INTO user_locations (user_id, kind, latitude, longitude, accuracy_m, source, captured_at, is_current)
          VALUES ($1, 'home', $2, $3, 10, 'admin_assigned', NOW(), true)
        `, [resident.user_id, location.lat, location.lng]);
        
        // Update their address to reflect VSM Heights Phase 1
        await neonPool.query(`
          UPDATE addresses 
          SET full_address = $1,
              subdivision = 'VSM Heights Phase 1'
          WHERE address_id = (
            SELECT address_id FROM users WHERE user_id = $2
          )
        `, [`${location.address}, San Isidro, General Santos City`, resident.user_id]);
        
        console.log(`✅ ${resident.username}: ${location.address} (${location.lat}, ${location.lng})`);
        
      } catch (error) {
        console.log(`❌ Error assigning location to ${resident.username}:`, error.message);
      }
    }
    
    // Verify the assignments in Neon
    console.log('\n🔍 Step 5: Verifying location assignments in Neon...');
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
      ORDER BY ul.latitude, ul.longitude
    `;
    
    const verifyResult = await neonPool.query(verifyQuery);
    console.log(`📊 All residents in Neon (VSM Heights Phase 1):`);
    
    verifyResult.rows.forEach((resident, index) => {
      const hasLocation = resident.latitude ? '✅' : '❌';
      console.log(`   ${index + 1}. ${hasLocation} ${resident.username} (${resident.full_name || 'N/A'})`);
      console.log(`      Address: ${resident.full_address}`);
      if (resident.latitude) {
        console.log(`      Location: ${resident.latitude}, ${resident.longitude}`);
      }
      console.log('');
    });
    
    // Final summary
    const withLocations = verifyResult.rows.filter(r => r.latitude).length;
    const withoutLocations = verifyResult.rows.length - withLocations;
    
    console.log('📈 NEON DATABASE SUMMARY:');
    console.log(`   👥 Total approved residents: ${verifyResult.rows.length}`);
    console.log(`   ✅ Residents with locations: ${withLocations}`);
    console.log(`   ❌ Residents without locations: ${withoutLocations}`);
    console.log(`   📍 All residents are now in VSM Heights Phase 1, San Isidro`);
    console.log(`   🚛 Locations are strategically placed for efficient collection routing`);
    
    if (withLocations === verifyResult.rows.length) {
      console.log('\n🎉 PERFECT! All approved residents now have locations in Neon database!');
      console.log('✅ Your collection system will now show all residents on the map!');
    } else {
      console.log(`\n⚠️ ${withoutLocations} residents still need locations.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await neonPool.end();
    process.exit(0);
  }
}

addVSMLocationsToNeon();
