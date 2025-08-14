const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async (user) => {
  const client = await pool.connect();
  console.log('\n🚀 Starting user registration process...');
  console.log('📝 Registration data received:', {
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    username: user.username,
    contactNumber: user.contactNumber,
    city: user.city,
    barangay: user.barangay,
    street: user.street
  });
  
  try {
    await client.query('BEGIN');
    console.log('📝 Transaction started');

    const {
      firstName, middleName, lastName, username,
      contactNumber, password, city, barangay, street
    } = user;

    // 1. Insert into user_names table
    console.log('\n👤 Inserting into user_names table:', { firstName, middleName, lastName });
    const nameQuery = `
      INSERT INTO user_names (first_name, middle_name, last_name)
      VALUES ($1, $2, $3)
      RETURNING name_id, first_name, middle_name, last_name;
    `;
    const nameResult = await client.query(nameQuery, [firstName, middleName || null, lastName]);
    const nameId = nameResult.rows[0].name_id;
    console.log('✅ user_names inserted successfully:', nameResult.rows[0]);

    // 2. Get city_id
    console.log('\n🏙️ Getting city_id for:', city);
    const cityQuery = `
      SELECT city_id, city_name FROM cities WHERE city_name = $1;
    `;
    const cityResult = await client.query(cityQuery, [city]);
    if (cityResult.rowCount === 0) {
      throw new Error('City not found');
    }
    const cityId = cityResult.rows[0].city_id;
    console.log('✅ Found city:', cityResult.rows[0]);

    // 3. Get barangay_id
    console.log('\n🏘️ Getting barangay_id for:', barangay);
    const barangayQuery = `
      SELECT barangay_id, barangay_name FROM barangays WHERE barangay_name = $1 AND city_id = $2;
    `;
    const barangayResult = await client.query(barangayQuery, [barangay, cityId]);
    if (barangayResult.rowCount === 0) {
      throw new Error('Barangay not found');
    }
    const barangayId = barangayResult.rows[0].barangay_id;
    console.log('✅ Found barangay:', barangayResult.rows[0]);

    // 4. Insert into addresses table
    console.log('\n📍 Inserting address:', { street, barangayId, cityId });
    const addressQuery = `
      INSERT INTO addresses (street, barangay_id, city_id)
      VALUES ($1, $2, $3)
      RETURNING address_id, street;
    `;
    const addressResult = await client.query(addressQuery, [street, barangayId, cityId]);
    const addressId = addressResult.rows[0].address_id;
    console.log('✅ Address inserted successfully:', addressResult.rows[0]);

    // 5. Insert into users table (password is already hashed)
    console.log('\n\ud83d\udc64 Creating user account for:', username);
    const userQuery = `
      INSERT INTO users (username, password_hash, contact_number, address_id, name_id, role_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING user_id, username, contact_number, created_at, updated_at;
    `;
    
    // Get the resident role_id
    const roleQuery = `SELECT role_id FROM roles WHERE role_name = 'resident'`;
    const roleResult = await client.query(roleQuery);
    const residentRoleId = roleResult.rows[0].role_id;
    
    const userResult = await client.query(userQuery, [
      username,
      password, // Use the already hashed password
      contactNumber,
      addressId,
      nameId,
      residentRoleId // Use the actual role_id from the roles table
    ]);
    console.log('\u2705 User account created successfully:', {
      user_id: userResult.rows[0].user_id,
      username: userResult.rows[0].username,
      contact_number: userResult.rows[0].contact_number,
      created_at: userResult.rows[0].created_at,
      updated_at: userResult.rows[0].updated_at
    });

    await client.query('COMMIT');
    console.log('\n✅ Transaction committed successfully! User registration complete!\n');

    return userResult.rows[0].user_id;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during registration:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Get user by username for login (using normalized structure)
const getUserByUsername = async (username) => {
  const query = `
    SELECT ud.*, r.role_name AS role
    FROM user_details ud
    JOIN roles r ON ud.role_id = r.role_id
    WHERE ud.username = $1
  `;
  const result = await pool.query(query, [username]);
  return result.rows[0];
};

const findByEmail = async (email) => {
  const query = `SELECT * FROM user_details WHERE email = $1`;
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

// Get user by ID with full details (using normalized structure)
const getUserById = async (userId) => {
  const query = `
    SELECT ud.*, r.role_name AS role, a.street, b.barangay_name, c.city_name
    FROM user_details ud
    LEFT JOIN roles r ON ud.role_id = r.role_id
    LEFT JOIN addresses a ON ud.address_id = a.address_id
    LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
    LEFT JOIN cities c ON a.city_id = c.city_id
    WHERE ud.user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

// Update user name
const updateUserName = async (userId, firstName, middleName, lastName) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get current name_id
    const userResult = await client.query('SELECT name_id FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const nameId = userResult.rows[0].name_id;
    
    // Update the name in user_names table
    const updateQuery = `
      UPDATE user_names 
      SET first_name = $1, middle_name = $2, last_name = $3, updated_at = NOW()
      WHERE name_id = $4
      RETURNING name_id, first_name, middle_name, last_name
    `;
    
    const result = await client.query(updateQuery, [firstName, middleName || null, lastName, nameId]);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get all users with pagination
const getAllUsers = async (limit = 10, offset = 0) => {
  const query = `
    SELECT ud.*, r.role_name AS role
    FROM user_details ud
    LEFT JOIN roles r ON ud.role_id = r.role_id
    ORDER BY ud.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
};

// Search users by name
const searchUsersByName = async (searchTerm) => {
  const query = `
    SELECT ud.*, r.role_name AS role
    FROM user_details ud
    LEFT JOIN roles r ON ud.role_id = r.role_id
    WHERE ud.full_name ILIKE $1 
       OR ud.first_name ILIKE $1 
       OR ud.last_name ILIKE $1
    ORDER BY ud.full_name
  `;
  const result = await pool.query(query, [`%${searchTerm}%`]);
  return result.rows;
};

module.exports = { 
  createUser, 
  getUserByUsername, 
  findByEmail, 
  getUserById, 
  updateUserName, 
  getAllUsers, 
  searchUsersByName 
};
