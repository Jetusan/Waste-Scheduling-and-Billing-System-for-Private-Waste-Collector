const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/dbAdmin');
const { authenticateJWT } = require('../middleware/auth');
const { getOwnProfile } = require('../controller/profileController');

// Registration endpoint
router.post('/register-optimized', async (req, res) => {
  try {
    const {
      firstName, middleName, lastName,
      username, contactNumber, password, confirmPassword,
      city, barangay, street, houseNumber, purok, email
    } = req.body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim() || !username?.trim() || 
        !contactNumber?.trim() || !password || !barangay?.trim() || !street?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT username FROM users WHERE username = $1',
      [username.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Get barangay ID
    const barangayResult = await pool.query(
      'SELECT barangay_id FROM barangays WHERE barangay_name = $1',
      [barangay]
    );

    if (barangayResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid barangay selected'
      });
    }

    const barangayId = barangayResult.rows[0].barangay_id;

    // Get resident role ID
    const roleResult = await pool.query(
      'SELECT role_id FROM roles WHERE role_name = $1',
      ['resident']
    );

    if (roleResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'System error: resident role not found'
      });
    }

    const roleId = roleResult.rows[0].role_id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create name record first
    const nameResult = await pool.query(`
      INSERT INTO user_names (first_name, middle_name, last_name)
      VALUES ($1, $2, $3)
      RETURNING name_id
    `, [firstName.trim(), middleName?.trim() || null, lastName.trim()]);

    const nameId = nameResult.rows[0].name_id;

    // Create address first
    const fullAddress = [houseNumber, street, purok, barangay, city, '9500'].filter(Boolean).join(', ');
    
    const addressResult = await pool.query(`
      INSERT INTO addresses (
        house_number, street_name, purok_or_sitio, barangay_id,
        city_municipality, zip_code, address_type, full_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING address_id
    `, [
      houseNumber || null, street, purok || null, barangayId,
      city, '9500', 'residential', fullAddress
    ]);

    const addressId = addressResult.rows[0].address_id;

    // Create user with name_id
    const userResult = await pool.query(`
      INSERT INTO users (
        username, password_hash, contact_number, email, role_id, address_id, name_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id, username
    `, [
      username.trim(), hashedPassword, contactNumber.trim(),
      email?.trim() || null, roleId, addressId, nameId
    ]);

    console.log(`✅ New user registered: ${username} (ID: ${userResult.rows[0].user_id})`);

    // Create the full name
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    res.json({
      success: true,
      message: 'Registration successful! You can now login.',
      user: {
        id: userResult.rows[0].user_id,
        username: userResult.rows[0].username,
        name: fullName,
        firstName: firstName,
        middleName: middleName || null,
        lastName: lastName,
        phone: contactNumber,
        address: fullAddress,
        barangay: barangay,
        city: city,
        street: street
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login endpoint
router.post('/login-enhanced', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user by username with role information
    const userResult = await pool.query(`
      SELECT u.user_id, u.username, u.password_hash, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = $1
    `, [username]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = userResult.rows[0];
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ User ${username} logged in successfully`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role_name || 'resident' // Include role from database
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Profile route - protected with JWT authentication
router.get('/profile', authenticateJWT, getOwnProfile);

// Barangays endpoint for registration dropdown
router.get('/barangays', async (req, res) => {
  try {
    const query = 'SELECT barangay_id, barangay_name FROM barangays ORDER BY barangay_name';
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching barangays:', error);
    res.status(500).json({ 
      error: 'Failed to fetch barangays',
      message: error.message 
    });
  }
});

module.exports = router;
