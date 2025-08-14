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
      'SELECT user_id FROM users WHERE contact_number = $1',
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
    
    // Create full address
    const fullAddress = [houseNumber?.trim(), street.trim(), purok?.trim(), barangay.trim(), city].filter(Boolean).join(', ');

    // Step 1: Get barangay_id from barangay name
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

    // Step 2: Insert into user_names table
    const insertNameQuery = `
      INSERT INTO user_names (first_name, middle_name, last_name)
      VALUES ($1, $2, $3) 
      RETURNING name_id;
    `;
    const nameResult = await client.query(insertNameQuery, [
      firstName.trim(),
      middleName?.trim() || null,
      lastName.trim()
    ]);
    const nameId = nameResult.rows[0].name_id;

    // Step 3: Insert into addresses table
    const insertAddressQuery = `
      INSERT INTO addresses (
        house_number, street_name, purok_or_sitio, barangay_id, 
        city_municipality, address_type, full_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING address_id;
    `;
    
    const addressResult = await client.query(insertAddressQuery, [
      houseNumber?.trim() || null,
      street.trim(),
      purok?.trim() || null,
      barangayId,
      city.trim(),
      'residential',
      fullAddress
    ]);
    const addressId = addressResult.rows[0].address_id;

    // Step 4: Insert into users table with foreign keys
    const insertUserQuery = `
      INSERT INTO users (
        username, password_hash, contact_number, email,
        address_id, name_id, role_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING user_id, username, created_at;
    `;

    const userResult = await client.query(insertUserQuery, [
      username.trim(),
      hashedPassword,
      normalizedPhone,
      email?.trim() || null,
      addressId,
      nameId,
      residentRoleId
    ]);
    const newUser = userResult.rows[0];

    await client.query('COMMIT');
    
    // Get full user details for response
    const fullName = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean).join(' ');
    
    console.log('✅ Optimized registration completed:', {
      user_id: newUser.user_id,
      username: newUser.username,
      full_name: fullName,
      address: fullAddress,
      phone: normalizedPhone,
      registration_date: newUser.created_at
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to WSBS!',
      user: {
        id: newUser.user_id,
        name: fullName,
        username: newUser.username,
        address: fullAddress,
        phone: normalizedPhone,
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
    const { username, password } = req.body;
    // Default source to 'web' if not provided or undefined
    const source = req.body.source || 'web';

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    // Query users table with proper joins to get name and address information
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.password_hash,
        u.contact_number,
        u.email,
        CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name,
        CONCAT(COALESCE(a.house_number, ''), ' ', a.street_name, ', ', 
               COALESCE(a.purok_or_sitio, ''), ' ', b.barangay_name, ', ', a.city_municipality) as full_address,
        r.role_name,
        u.created_at
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN roles r ON u.role_id = r.role_id
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
      source: source,
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
        phone: user.contact_number,
        email: user.email,
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

// Optimized get user profile function
const getUserProfileOptimized = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    // Query users table with role, address, and name information
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.contact_number,
        u.created_at,
        u.updated_at,
        r.role_name,
        un.first_name,
        un.middle_name,
        un.last_name,
        a.house_number,
        a.street_name,
        a.purok_or_sitio as purok,
        b.barangay_name,
        a.city_municipality as city_name,
        a.full_address,
        cs.status as subscription_status,
        cs.billing_start_date as subscription_start_date,
        sp.plan_name as subscription_plan
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE u.user_id = $1;
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const user = result.rows[0];
    
    console.log('✅ Profile retrieved:', {
      user_id: user.user_id,
      username: user.username,
      role: user.role_name
    });

    res.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.username,
        name: user.first_name && user.last_name ? 
          `${user.first_name}${user.middle_name ? ' ' + user.middle_name : ''} ${user.last_name}`.trim() : null,
        firstName: user.first_name,
        middleName: user.middle_name,
        lastName: user.last_name,
        phone: user.contact_number,
        email: user.email,
        address: {
          full: user.full_address,
          street: user.street_name,
          houseNumber: user.house_number,
          purok: user.purok,
          barangay: user.barangay_name,
          city: user.city_name
        },
        role: user.role_name,
        subscription: user.subscription_status ? {
          status: user.subscription_status,
          startDate: user.subscription_start_date,
          plan: user.subscription_plan
        } : null,
        registrationDate: user.created_at,
        lastUpdated: user.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Profile retrieval error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve profile. Please try again.' 
    });
  }
};

module.exports = {
  registerUserOptimized,
  loginUserOptimized,
  getUserProfileOptimized,
  validateAndNormalizePhone
};
