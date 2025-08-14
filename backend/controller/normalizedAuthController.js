const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

/**
 * Register a new user with normalized database structure
 * This controller works with the new addresses table and user_details view
 */
const registerNormalized = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Extract data from request body
    const {
      firstName,
      middleName,
      lastName,
      username,
      contactNumber,
      password,
      confirmPassword,
      city,
      barangay,
      street,
      houseNumber,
      purok,
      email
    } = req.body;

    console.log('📝 Starting normalized registration for:', username);

    // 1. Input validation
    if (!firstName || !lastName || !username || !contactNumber || !password || !street || !barangay) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, username, contactNumber, password, street, barangay'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    await client.query('BEGIN');

    // 2. Check if username already exists
    const existingUser = await client.query(
      'SELECT user_id FROM users WHERE username = $1',
      [username.trim()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Username already exists. Please choose a different username.'
      });
    }

    // 3. Normalize phone number
    const normalizePhone = (phone) => {
      if (!phone) return phone;
      
      // Remove all non-digit characters except +
      let cleaned = phone.replace(/[^0-9+]/g, '');
      
      // Handle different Philippine phone formats
      if (/^09[0-9]{9}$/.test(cleaned)) {
        return '+63' + cleaned.substring(1); // Convert 09XXXXXXXXX to +639XXXXXXXXX
      } else if (/^\+639[0-9]{9}$/.test(cleaned)) {
        return cleaned; // Already in correct format
      } else if (/^639[0-9]{9}$/.test(cleaned)) {
        return '+' + cleaned; // Add + prefix
      }
      
      return phone; // Return original if doesn't match patterns
    };

    const normalizedPhone = normalizePhone(contactNumber);
    console.log(`📞 Phone normalized: ${contactNumber} → ${normalizedPhone}`);

    // 4. Check if address already exists
    const existingAddressQuery = `
      SELECT address_id FROM addresses 
      WHERE street = $1 
        AND barangay_name = $2 
        AND city_name = $3
        AND ($4::VARCHAR IS NULL AND house_number IS NULL OR house_number = $4)
        AND ($5::VARCHAR IS NULL AND purok IS NULL OR purok = $5)
    `;
    
    const existingAddress = await client.query(existingAddressQuery, [
      street.trim(),
      barangay.trim(),
      city.trim() || 'General Santos City',
      houseNumber?.trim() || null,
      purok?.trim() || null
    ]);

    let addressId;
    
    if (existingAddress.rows.length > 0) {
      // Use existing address
      addressId = existingAddress.rows[0].address_id;
      console.log(`🏠 Using existing address ID: ${addressId}`);
    } else {
      // Get barangay_id from barangay name first
      const barangayQuery = `
        SELECT barangay_id FROM barangays 
        WHERE LOWER(barangay_name) = LOWER($1)
      `;
      const barangayResult = await client.query(barangayQuery, [barangay.trim()]);
      
      if (barangayResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          message: `Barangay '${barangay}' not found in the system` 
        });
      }
      const barangayId = barangayResult.rows[0].barangay_id;

      // Create new address
      const addressInsertQuery = `
        INSERT INTO addresses (house_number, street_name, purok_or_sitio, barangay_id, city_municipality, address_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING address_id, full_address
      `;
      
      const addressResult = await client.query(addressInsertQuery, [
        houseNumber?.trim() || null,
        street.trim(),
        purok?.trim() || null,
        barangayId,
        city.trim() || 'General Santos City',
        'residential'
      ]);
      
      addressId = addressResult.rows[0].address_id;
      const fullAddress = addressResult.rows[0].full_address;
      console.log(`🏠 Created new address ID: ${addressId}`);
      console.log(`📍 Full address: ${fullAddress}`);
    }

    // 5. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Insert new user with address reference
    const userInsertQuery = `
      INSERT INTO users (
        first_name, middle_name, last_name, username, password_hash,
        primary_phone, contact_number, email, address_id, role_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING user_id
    `;

    const userResult = await client.query(userInsertQuery, [
      firstName.trim(),
      middleName?.trim() || null,
      lastName.trim(),
      username.trim(),
      passwordHash,
      normalizedPhone,
      normalizedPhone, // Store normalized phone in both fields for compatibility
      email?.trim() || null,
      addressId,
      1 // Default role_id for regular users
    ]);

    const userId = userResult.rows[0].user_id;

    await client.query('COMMIT');

    // 7. Get complete user details for response
    const userDetailsQuery = `
      SELECT 
        u.user_id, 
        u.username, 
        CONCAT(un.first_name, ' ', COALESCE(un.middle_name, ''), ' ', un.last_name) as full_name,
        u.contact_number as primary_phone, 
        u.email,
        a.full_address, 
        b.barangay_name, 
        u.created_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.user_id = $1
    `;
    
    const userDetails = await client.query(userDetailsQuery, [userId]);
    const user = userDetails.rows[0];

    console.log(`✅ User '${username}' registered successfully with ID: ${userId}`);
    console.log(`📍 Address: ${user.full_address}`);

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        phone: user.primary_phone,
        email: user.email,
        address: user.full_address,
        barangay: user.barangay_name,
        createdAt: user.created_at
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);

    // Handle specific database errors
    if (err.code === '23505') {
      if (err.constraint === 'users_username_key') {
        return res.status(400).json({
          success: false,
          message: 'Username already exists. Please choose a different username.'
        });
      }
    }

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Invalid barangay or address information provided.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });

  } finally {
    client.release();
  }
};

/**
 * Get user details by ID using the normalized structure
 */
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userQuery = `
      SELECT 
        u.user_id, 
        u.username, 
        CONCAT(un.first_name, ' ', COALESCE(un.middle_name, ''), ' ', un.last_name) as full_name,
        u.contact_number as primary_phone, 
        u.email,
        a.house_number, 
        a.street_name as street, 
        a.purok_or_sitio as purok, 
        b.barangay_name, 
        a.city_municipality as city_name,
        a.full_address, 
        u.role_id, 
        u.created_at, 
        u.updated_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.user_id = $1
    `;
    
    const result = await pool.query(userQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
    
  } catch (err) {
    console.error('Get user details error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details'
    });
  }
};

/**
 * Get users by barangay (useful for area-based features)
 */
const getUsersByBarangay = async (req, res) => {
  try {
    const { barangayName } = req.params;
    
    const query = `
      SELECT 
        u.user_id, 
        u.username, 
        CONCAT(un.first_name, ' ', COALESCE(un.middle_name, ''), ' ', un.last_name) as full_name,
        u.contact_number as primary_phone,
        a.full_address, 
        u.created_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE LOWER(b.barangay_name) = LOWER($1)
      ORDER BY un.first_name, un.last_name
    `;
    
    const result = await pool.query(query, [barangayName]);
    
    res.json({
      success: true,
      barangay: barangayName,
      userCount: result.rows.length,
      users: result.rows
    });
    
  } catch (err) {
    console.error('Get users by barangay error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users by barangay'
    });
  }
};

/**
 * Search users by address or name
 */
const searchUsers = async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;
    
    const searchQuery = `
      SELECT 
        u.user_id, 
        u.username, 
        CONCAT(un.first_name, ' ', COALESCE(un.middle_name, ''), ' ', un.last_name) as full_name,
        u.contact_number as primary_phone,
        a.full_address, 
        b.barangay_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE CONCAT(un.first_name, ' ', COALESCE(un.middle_name, ''), ' ', un.last_name) ILIKE $1 
         OR a.full_address ILIKE $1 
         OR u.username ILIKE $1
      ORDER BY un.first_name, un.last_name
      LIMIT 50
    `;
    
    const result = await pool.query(searchQuery, [searchTerm]);
    
    res.json({
      success: true,
      query,
      resultCount: result.rows.length,
      users: result.rows
    });
    
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
};

module.exports = {
  registerNormalized,
  getUserDetails,
  getUsersByBarangay,
  searchUsers
};
