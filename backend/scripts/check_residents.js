const pool = require('../config/db');

async function checkResidents() {
  try {
    console.log('🔍 Finding residents (role_id = 3)...');
    const residentsQuery = `
      SELECT u.user_id, u.username, u.approval_status,
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
             a.full_address, a.subdivision, a.street,
             ul.latitude, ul.longitude, ul.captured_at
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN user_locations ul ON u.user_id = ul.user_id AND ul.kind = 'home' AND ul.is_current = true
      WHERE u.role_id = 3 AND u.approval_status = 'approved'
      ORDER BY u.user_id
    `;
    
    const result = await pool.query(residentsQuery);
    console.log(`📊 Found ${result.rows.length} approved residents:`);
    
    result.rows.forEach((resident, index) => {
      console.log(`${index + 1}. User ID: ${resident.user_id}`);
      console.log(`   Username: ${resident.username}`);
      console.log(`   Name: ${resident.full_name || 'N/A'}`);
      console.log(`   Address: ${resident.full_address || 'N/A'}`);
      console.log(`   Subdivision: ${resident.subdivision || 'N/A'}`);
      console.log(`   Has Location: ${resident.latitude ? 'Yes (' + resident.latitude + ', ' + resident.longitude + ')' : 'No'}`);
      console.log('');
    });
    
    const withoutLocation = result.rows.filter(r => !r.latitude);
    console.log(`❌ Residents without locations: ${withoutLocation.length}`);
    withoutLocation.forEach(r => console.log(`   - ${r.username} (ID: ${r.user_id})`));
    
    // Check barangays
    console.log('\n🏘️ Available barangays:');
    const barangayQuery = 'SELECT barangay_id, barangay_name FROM barangays ORDER BY barangay_name';
    const barangayResult = await pool.query(barangayQuery);
    barangayResult.rows.forEach(b => console.log(`   - ${b.barangay_name} (ID: ${b.barangay_id})`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkResidents();
