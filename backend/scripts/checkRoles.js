const { pool } = require('../config/db');

async function checkRoles() {
  try {
    console.log('🔍 CHECKING ROLES AND USER STATUS');
    console.log('=================================');
    
    // Check roles
    const rolesResult = await pool.query('SELECT * FROM roles ORDER BY role_id');
    console.log('ROLES:');
    rolesResult.rows.forEach(role => {
      console.log(`   • ${role.role_id} - ${role.role_name}`);
    });
    
    // Check our created users' status
    const usersResult = await pool.query(`
      SELECT u.user_id, u.username, u.role_id, u.approval_status,
             COALESCE(un.first_name || ' ' || un.last_name, u.username) as full_name,
             b.barangay_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE b.barangay_name = 'San Isidro'
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    
    console.log('\nOUR CREATED USERS STATUS:');
    usersResult.rows.forEach(user => {
      console.log(`   • ${user.full_name} - Role: ${user.role_id}, Status: ${user.approval_status}`);
    });
    
    // Check what the billing query expects
    console.log('\nBILLING QUERY EXPECTS:');
    console.log('   • role_id = 3 (but our users have role_id = 2)');
    console.log('   • approval_status = "approved" (but our users have "pending")');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRoles();
