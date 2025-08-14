const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

// Phone number validation and normalization function
const validateAndNormalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number is required');
  }
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Philippine mobile number patterns
  if (cleaned.match(/^09\d{9}$/)) {
    return `+63${cleaned.substring(1)}`;
  }
  if (cleaned.match(/^639\d{9}$/)) {
    return `+${cleaned}`;
  }
  if (cleaned.match(/^\+639\d{9}$/)) {
    return cleaned;
  }
  
  throw new Error('Please enter a valid Philippine mobile number starting with 09 (e.g., 09123456789)');
};

// Enhanced registration function
const registerUserEnhanced = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      firstName, middleName, lastName, username, 
      contactNumber, password, confirmPassword,
      street, purok, barangay, city = 'General Santos City',
      houseNumber, email
    } = req.body;

    // Enhanced validation
    const validationErrors = [];
    
    if (!firstName?.trim() || firstName.length < 2) {
      validationErrors.push('First name must be at least 2 characters');
    }
    
    if (!lastName?.trim() || lastName.length < 2) {
      validationErrors.push('Last name must be at least 2 characters');
    }
    
    if (!username?.trim() || username.length < 4) {
      validationErrors.push('Username must be at least 4 characters');
    }
    
    if (!street?.trim()) {
      validationErrors.push('Street address is required');
    }
    
    if (!barangay?.trim()) {
      validationErrors.push('Barangay is required');
    }

    // Password validation
    if (!password || password.length < 8) {
      validationErrors.push('Password must be at least 8 characters');
    }
    
    if (password !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    if (validationErrors.length > 0) {
      console.log('❌ Validation errors:', validationErrors);
      console.log('📋 Received data:', { firstName, lastName, username, contactNumber, street, barangay, password: password ? '[PROVIDED]' : '[MISSING]', confirmPassword: confirmPassword ? '[PROVIDED]' : '[MISSING]' });
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }

    // Validate and normalize phone number
    let normalizedPhone;
    try {
      normalizedPhone = validateAndNormalizePhone(contactNumber);
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }

    // Check if username already exists
    const existingUser = await client.query(
      'SELECT username FROM user_registrations WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Username already exists. Please choose a different username.' 
      });
    }

    // Check if phone already exists
    const existingPhone = await client.query(
      'SELECT primary_phone FROM contact_info WHERE primary_phone = $1',
      [normalizedPhone]
    );
    
    if (existingPhone.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'This phone number is already registered. Please use a different number.' 
      });
    }

    // Hash password with higher salt rounds for security
    const hashedPassword = await bcrypt.hash(password, 12);

    // 1. Insert enhanced address
    const addressQuery = `
      INSERT INTO enhanced_addresses (
        house_number, street, purok, barangay_name, 
        city_name, address_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING address_id, full_address;
    `;
    
    const addressResult = await client.query(addressQuery, [
      houseNumber?.trim() || null,
      street.trim(),
      purok?.trim() || null,
      barangay.trim(),
      city,
      'residential'
    ]);
    
    const addressId = addressResult.rows[0].address_id;
    const fullAddress = addressResult.rows[0].full_address;

    // 2. Insert contact information
    const contactQuery = `
      INSERT INTO contact_info (primary_phone, email)
      VALUES ($1, $2)
      RETURNING contact_id;
    `;
    
    const contactResult = await client.query(contactQuery, [
      normalizedPhone,
      email?.trim() || null
    ]);
    
    const contactId = contactResult.rows[0].contact_id;

    // 3. Get resident role ID
    const roleQuery = `SELECT role_id FROM roles WHERE role_name = 'resident'`;
    const roleResult = await client.query(roleQuery);
    
    if (roleResult.rows.length === 0) {
      throw new Error('Resident role not found. Please contact system administrator.');
    }
    
    const residentRoleId = roleResult.rows[0].role_id;

    // 4. Insert user registration
    const userQuery = `
      INSERT INTO user_registrations (
        first_name, middle_name, last_name, username, password_hash,
        address_id, contact_id, role_id, customer_segment, acquisition_source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING registration_id, full_name, registration_date;
    `;
    
    const userResult = await client.query(userQuery, [
      firstName.trim(),
      middleName?.trim() || null,
      lastName.trim(),
      username.trim(),
      hashedPassword,
      addressId,
      contactId,
      residentRoleId,
      'standard',
      'mobile_app'
    ]);

    await client.query('COMMIT');

    // Log successful registration
    console.log(`✅ Enhanced registration completed:`);
    console.log(`   👤 User: ${userResult.rows[0].full_name} (${username})`);
    console.log(`   📍 Address: ${fullAddress}`);
    console.log(`   📱 Phone: ${normalizedPhone}`);
    console.log(`   📅 Date: ${userResult.rows[0].registration_date}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to WSBS!',
      user: {
        id: userResult.rows[0].registration_id,
        name: userResult.rows[0].full_name,
        username: username,
        address: fullAddress,
        phone: normalizedPhone,
        registrationDate: userResult.rows[0].registration_date
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Enhanced registration error:', error);

    if (error.message.includes('phone number')) {
      return res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Enhanced login function
const loginUserEnhanced = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username?.trim() || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    // Find user in users table (using actual database schema)
    const userQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.password_hash,
        CONCAT(u.first_name, ' ', COALESCE(u.middle_name, ''), ' ', u.last_name) as full_name,
        u.first_name,
        u.last_name,
        'active' as registration_status,
        CONCAT(u.street, ', ', u.barangay_name, ', ', u.city_name) as full_address,
        u.contact_number as primary_phone,
        u.email,
        r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE LOWER(u.username) = LOWER($1)
    `;
    
    const userResult = await pool.query(userQuery, [username.trim()]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if account is active
    if (user.registration_status !== 'active') {
      return res.status(401).json({ 
        success: false,
        message: 'Account is not active. Please contact support.' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    // Update last login timestamp (using users table)
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    console.log(`✅ Enhanced login successful: ${user.full_name} (${user.username})`);

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.user_id,
        username: user.username,
        name: user.full_name,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
        address: user.full_address,
        phone: user.primary_phone,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Enhanced login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.'
    });
  }
};

module.exports = {
  // Enhanced auth functions disabled - using optimized auth instead
  registerUserEnhanced: (req, res) => {
    return res.status(501).json({
      success: false,
      message: 'Enhanced registration is disabled. Use /api/auth/register-optimized instead.'
    });
  },
  
  loginUserEnhanced: (req, res) => {
    return res.status(501).json({
      success: false,
      message: 'Enhanced login is disabled. Use /api/auth/login-optimized instead.'
    });
  }
};
