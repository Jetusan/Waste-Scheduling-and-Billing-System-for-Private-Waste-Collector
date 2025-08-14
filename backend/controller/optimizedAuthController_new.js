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

// Optimized registration function for consolidated users table
const registerUserOptimized = async (req, res) => {
  console.log('🚀 OPTIMIZED REGISTRATION FUNCTION CALLED 🚀');
  console.log('🔥 Optimized registration route hit!');
  console.log('📝 Request body:', req.body);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      firstName, middleName, lastName, username, 
      contactNumber, password, confirmPassword,
      street, purok, barangay, city = 'General Santos City',
      houseNumber, landmark, email
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

    console.log('📋 Received data:', {
      firstName,
      lastName,
      username,
      contactNumber,
      street,
      barangay,
      password: password ? '[PROVIDED]' : '[MISSING]',
      confirmPassword: confirmPassword ? '[PROVIDED]' : '[MISSING]'
    });

    if (validationErrors.length > 0) {
      console.log('❌ Validation errors:', validationErrors);
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
    } catch (phoneError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        message: phoneError.message 
      });
    }

    // Check for existing username
    const existingUser = await client.query(
      'SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        message: 'Username already exists' 
      });
    }

    // Check for existing phone number
    const existingPhone = await client.query(
      'SELECT user_id FROM users WHERE primary_phone = $1 OR contact_number = $1',
      [normalizedPhone]
    );

    if (existingPhone.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        message: 'Phone number already registered' 
      });
    }

    // Get resident role ID
    const roleResult = await client.query('SELECT role_id FROM roles WHERE role_name = $1', ['resident']);
    if (roleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ 
        success: false,
        message: 'Resident role not found in system' 
      });
    }
    const residentRoleId = roleResult.rows[0].role_id;

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create full name and address
    const fullName = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean).join(' ');
    const fullAddress = [houseNumber?.trim(), street.trim(), purok?.trim(), barangay.trim(), city].filter(Boolean).join(', ');

    // Insert consolidated user data
    const insertUserQuery = `
      INSERT INTO users (
        username, password_hash, role_id,
        first_name, middle_name, last_name, full_name,
        primary_phone, contact_number, email,
        street, house_number, purok, barangay_name, city_name, full_address, landmark,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      ) RETURNING user_id, username, full_name, full_address, primary_phone, created_at;
    `;

    const values = [
      username.trim(),
      hashedPassword, 
      residentRoleId,
      firstName.trim(),
      middleName?.trim() || null,
      lastName.trim(),
      fullName,
      normalizedPhone,
      email?.trim() || null,
      street.trim(),
      houseNumber?.trim() || null,
      purok?.trim() || null,
      barangay.trim(),
      city.trim(),
      fullAddress,
      landmark?.trim() || null
    ];

    const userResult = await client.query(insertUserQuery, values);
    const newUser = userResult.rows[0];

    // Insert resident-specific data (subscription)
    const insertResidentQuery = `
      INSERT INTO residents (
        user_id, subscription_status, created_at, updated_at
      ) VALUES ($1, $2, NOW(), NOW()) 
      RETURNING resident_id, subscription_status;
    `;

    const residentResult = await client.query(insertResidentQuery, [
      newUser.user_id,
      'inactive' // Default to inactive until they subscribe
    ]);

    await client.query('COMMIT');
    
    console.log('✅ Optimized registration completed:', {
      user_id: newUser.user_id,
      resident_id: residentResult.rows[0].resident_id,
      username: newUser.username,
      full_name: newUser.full_name,
      address: newUser.full_address,
      phone: newUser.primary_phone,
      subscription: residentResult.rows[0].subscription_status,
      registration_date: newUser.created_at
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to WSBS!',
      user: {
        id: newUser.user_id,
        resident_id: residentResult.rows[0].resident_id,
        name: newUser.full_name,
        username: newUser.username,
        address: newUser.full_address,
        phone: newUser.primary_phone,
        subscription_status: residentResult.rows[0].subscription_status,
        registrationDate: newUser.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Registration error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        success: false,
        message: 'Username or phone number already exists' 
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

// Optimized login function
const loginUserOptimized = async (req, res) => {
  console.log('🔐 Optimized login route hit!');
  console.log('📝 Request body:', { username: req.body.username, source: req.body.source });
  
  try {
    const { username, password, source } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    // Query consolidated users table with role information
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.password_hash,
        u.full_name,
        u.primary_phone,
        u.full_address,
        r.role_name,
        u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE LOWER(u.username) = LOWER($1);
    `;

    const result = await pool.query(query, [username.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    // Determine if this is a mobile app login or web login
    const isMobileApp = source === 'mobile_app' || source === 'collector_app';
    
    console.log('✅ Login successful:', {
      user_id: user.user_id,
      username: user.username,
      role: user.role_name,
      source: source || 'web',
      is_mobile: isMobileApp
    });

    // Return appropriate response based on source
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.user_id,
        username: user.username,
        name: user.full_name,
        phone: user.primary_phone,
        address: user.full_address,
        role: user.role_name,
        loginDate: new Date().toISOString()
      },
      ...(isMobileApp && { token: 'mobile_session_' + user.user_id }) // Simple token for mobile
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again.' 
    });
  }
};

module.exports = {
  registerUserOptimized,
  loginUserOptimized,
  validateAndNormalizePhone
};
