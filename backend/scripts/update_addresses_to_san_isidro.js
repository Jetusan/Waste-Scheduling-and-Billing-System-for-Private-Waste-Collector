const pool = require('../config/db');

async function updateAddressesToSanIsidro() {
  try {
    console.log('🔍 Updating all addresses to San Isidro barangay...\n');
    
    // First, find San Isidro barangay ID
    const sanIsidroQuery = 'SELECT barangay_id, barangay_name FROM barangays WHERE barangay_name = $1';
    const sanIsidroResult = await pool.query(sanIsidroQuery, ['San Isidro']);
    
    if (sanIsidroResult.rows.length === 0) {
      console.log('❌ San Isidro barangay not found!');
      return;
    }
    
    const sanIsidroId = sanIsidroResult.rows[0].barangay_id;
    console.log(`✅ San Isidro found: ID ${sanIsidroId}`);
    
    // Check current address distribution
    console.log('\n📊 Current address distribution by barangay:');
    const currentDistributionQuery = `
      SELECT b.barangay_name, COUNT(a.address_id) as address_count
      FROM barangays b
      LEFT JOIN addresses a ON b.barangay_id = a.barangay_id
      GROUP BY b.barangay_id, b.barangay_name
      HAVING COUNT(a.address_id) > 0
      ORDER BY COUNT(a.address_id) DESC
    `;
    const currentResult = await pool.query(currentDistributionQuery);
    
    currentResult.rows.forEach(row => {
      console.log(`   - ${row.barangay_name}: ${row.address_count} addresses`);
    });
    
    // Count total addresses that need to be updated
    const totalAddressesQuery = 'SELECT COUNT(*) as total FROM addresses WHERE barangay_id != $1';
    const totalResult = await pool.query(totalAddressesQuery, [sanIsidroId]);
    const totalToUpdate = totalResult.rows[0].total;
    
    console.log(`\n🔄 Addresses to update: ${totalToUpdate}`);
    
    if (totalToUpdate === 0) {
      console.log('✅ All addresses are already in San Isidro!');
      return;
    }
    
    // Show which users will be affected
    console.log('\n👥 Users whose addresses will be updated:');
    const affectedUsersQuery = `
      SELECT u.user_id, u.username, 
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
             a.full_address, b.barangay_name as current_barangay
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE a.barangay_id != $1 AND a.barangay_id IS NOT NULL
      ORDER BY u.user_id
    `;
    const affectedResult = await pool.query(affectedUsersQuery, [sanIsidroId]);
    
    affectedResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.full_name || 'N/A'})`);
      console.log(`      Current: ${user.current_barangay}`);
      console.log(`      Address: ${user.full_address}`);
      console.log('');
    });
    
    // Perform the update
    console.log('🚀 Updating all addresses to San Isidro...');
    const updateQuery = `
      UPDATE addresses 
      SET barangay_id = $1,
          full_address = REGEXP_REPLACE(
            full_address, 
            ', [^,]+, General Santos City$', 
            ', San Isidro, General Santos City'
          )
      WHERE barangay_id != $1
    `;
    
    const updateResult = await pool.query(updateQuery, [sanIsidroId]);
    console.log(`✅ Updated ${updateResult.rowCount} addresses to San Isidro`);
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifyQuery = `
      SELECT b.barangay_name, COUNT(a.address_id) as address_count
      FROM barangays b
      LEFT JOIN addresses a ON b.barangay_id = a.barangay_id
      GROUP BY b.barangay_id, b.barangay_name
      HAVING COUNT(a.address_id) > 0
      ORDER BY COUNT(a.address_id) DESC
    `;
    const verifyResult = await pool.query(verifyQuery);
    
    console.log('📊 Updated address distribution:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.barangay_name}: ${row.address_count} addresses`);
    });
    
    // Show updated users
    console.log('\n👥 Sample of updated user addresses:');
    const sampleQuery = `
      SELECT u.user_id, u.username, 
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
             a.full_address
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      WHERE a.barangay_id = $1
      ORDER BY u.user_id
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery, [sanIsidroId]);
    
    sampleResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.full_name || 'N/A'})`);
      console.log(`      Address: ${user.full_address}`);
      console.log('');
    });
    
    console.log('✅ All addresses have been successfully updated to San Isidro!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

updateAddressesToSanIsidro();
