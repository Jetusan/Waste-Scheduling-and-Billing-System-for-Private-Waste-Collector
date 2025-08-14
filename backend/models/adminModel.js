const { pool } = require('../config/db');

// Create an admin user (for initial setup)
const createAdminUser = async (adminData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert into user_names table
    const nameQuery = `
      INSERT INTO user_names (first_name, middle_name, last_name)
      VALUES ($1, $2, $3)
      RETURNING name_id;
    `;
    const nameResult = await client.query(nameQuery, [
      adminData.firstName || 'Admin',
      adminData.middleName || null,
      adminData.lastName || 'User'
    ]);
    const nameId = nameResult.rows[0].name_id;

    // Get admin role_id
    const roleQuery = `SELECT role_id FROM roles WHERE role_name = 'admin'`;
    const roleResult = await client.query(roleQuery);
    const adminRoleId = roleResult.rows[0].role_id;

    // Get or create a default address for admin
    // First check if there's already a default admin address
    const addressCheckQuery = `
      SELECT address_id FROM addresses 
      WHERE street = 'Admin Office' 
      LIMIT 1;
    `;
    const addressCheckResult = await client.query(addressCheckQuery);
    
    let addressId;
    if (addressCheckResult.rows.length > 0) {
      addressId = addressCheckResult.rows[0].address_id;
    } else {
      // Get default city (General Santos City)
      const cityQuery = `SELECT city_id FROM cities WHERE city_name = 'General Santos City' LIMIT 1`;
      const cityResult = await client.query(cityQuery);
      const cityId = cityResult.rows[0].city_id;
      
      // Get a default barangay
      const barangayQuery = `SELECT barangay_id FROM barangays WHERE city_id = $1 LIMIT 1`;
      const barangayResult = await client.query(barangayQuery, [cityId]);
      const barangayId = barangayResult.rows[0].barangay_id;
      
      // Create default address for admin
      const addressQuery = `
        INSERT INTO addresses (street, barangay_id, city_id)
        VALUES ($1, $2, $3)
        RETURNING address_id;
      `;
      const addressResult = await client.query(addressQuery, ['Admin Office', barangayId, cityId]);
      addressId = addressResult.rows[0].address_id;
    }

    // Insert into users table
    const userQuery = `
      INSERT INTO users (username, password_hash, contact_number, address_id, name_id, role_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING user_id, username, created_at;
    `;
    const userResult = await client.query(userQuery, [
      adminData.username,
      adminData.password_hash,
      adminData.contactNumber || '000-000-0000',
      addressId,
      nameId,
      adminRoleId
    ]);

    await client.query('COMMIT');
    return userResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get admin user by username for login
const getAdminUserByUsername = async (username) => {
  const query = `
    SELECT u.*, r.role_name AS role
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.username = $1 AND r.role_name = 'admin'
  `;
  const result = await pool.query(query, [username]);
  return result.rows[0];
};

module.exports = { createAdminUser, getAdminUserByUsername };
