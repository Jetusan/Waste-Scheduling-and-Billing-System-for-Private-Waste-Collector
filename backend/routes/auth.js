const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/dbAdmin');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/emailService');

// Multer setup for proof image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});
const { authenticateJWT } = require('../middleware/auth');
const { getOwnProfile } = require('../controller/profileController');

// Philippine phone number validation and normalization
const validateAndNormalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number is required');
  }

  // Trim and check for leading +
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');

  // Remove all non-digit characters
  let digits = trimmed.replace(/\D/g, '');

  // Re-add + if it was at the start
  if (hasPlus) digits = '+' + digits;

  // Now validate
  if (digits.match(/^09\d{9}$/)) {
    return `+63${digits.substring(1)}`;
  }
  if (digits.match(/^639\d{9}$/)) {
    return `+${digits}`;
  }
  if (digits.match(/^\+639\d{9}$/)) {
    return digits;
  }

  throw new Error('Please enter a valid Philippine mobile number (09xxxxxxxxx, 639xxxxxxxxx, or +639xxxxxxxxx)');
};

// Helper function to create admin notification
const createAdminNotification = async (title, message) => {
  try {
    // Get all admin users
    const adminQuery = `
      SELECT u.user_id 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.role_id 
      WHERE r.role_name = 'admin'
    `;
    const adminResult = await pool.query(adminQuery);
    
    // Create notification for each admin
    for (const admin of adminResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, is_read, created_at) 
         VALUES ($1, $2, $3, false, NOW())`,
        [admin.user_id, title, message]
      );
    }
    console.log(`✅ Admin notification created: ${title}`);
  } catch (error) {
    console.error('❌ Failed to create admin notification:', error);
  }
};

// Registration endpoint with image upload
router.post('/register-optimized', upload.single('proofImage'), async (req, res) => {
  try {
    const {
      firstName, middleName, lastName,
      username, contactNumber, password, confirmPassword,
      city, barangay, subdivision, street, block, lot, houseNumber, purok, email, dateOfBirth
    } = req.body;
    // Debug: log received fields (no sensitive values)
    try {
      console.log('Register-optimized received fields:', {
        firstName: !!firstName,
        middleName: middleName ? '[PROVIDED]' : null,
        lastName: !!lastName,
        username: !!username,
        contactNumber: !!contactNumber,
        password: password ? '[PROVIDED]' : null,
        confirmPassword: confirmPassword ? '[PROVIDED]' : null,
        city: !!city,
        barangay: !!barangay,
        subdivision: !!subdivision,
        street: street ? '[PROVIDED]' : null,
        block: !!block,
        lot: !!lot,
        houseNumber: houseNumber ? '[PROVIDED]' : null,
        purok: purok ? '[PROVIDED]' : null,
        email: email ? '[PROVIDED]' : null,
        dateOfBirth: !!dateOfBirth,
        hasFile: !!req.file
      });
    } catch (e) {
      console.warn('Field logging failed:', e.message);
    }
    // Multer file
    let proofImagePath = null;
    if (req.file) {
      proofImagePath = req.file.path;
    }

    // Validate required fields (street optional) with detailed feedback
    const missingFields = [];
    if (!firstName?.trim()) missingFields.push('firstName');
    if (!lastName?.trim()) missingFields.push('lastName');
    if (!username?.trim()) missingFields.push('username');
    if (!contactNumber?.trim()) missingFields.push('contactNumber');
    if (!password) missingFields.push('password');
    if (!barangay?.trim()) missingFields.push('barangay');
    if (!subdivision?.trim()) missingFields.push('subdivision');
    if (!block?.trim()) missingFields.push('block');
    if (!lot?.trim()) missingFields.push('lot');

    if (missingFields.length > 0) {
      console.warn('Registration missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields',
        errors: missingFields
      });
    }

    // Validate birthdate
    if (!dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required'
      });
    }

    // Validate age (must be 18+)
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date of birth format'
      });
    }

    if (birthDate > today) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth cannot be in the future'
      });
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && dayDiff < 0)) {
      return res.status(400).json({
        success: false,
        message: 'You must be at least 18 years old to register'
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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create name record first
    const nameResult = await pool.query(`
      INSERT INTO user_names (first_name, middle_name, last_name)
      VALUES ($1, $2, $3)
      RETURNING name_id
    `, [firstName.trim(), middleName?.trim() || null, lastName.trim()]);

    const nameId = nameResult.rows[0].name_id;

    // Create address with all the new fields
    const fullAddress = [block, lot, subdivision, street, purok, barangay, city].filter(Boolean).join(', ');
    
    const addressResult = await pool.query(`
      INSERT INTO addresses (
        block, lot, subdivision, street, barangay_id,
        city_municipality, address_type, full_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING address_id
      `, 
      [block, lot, subdivision, (street && street.trim()) ? street.trim() : null, barangayId,
      city, 'residential', fullAddress
    ]);

    const addressId = addressResult.rows[0].address_id;

    // Create user with email verification fields
    const userResult = await pool.query(`
      INSERT INTO users (
        username, password_hash, contact_number, email, role_id, address_id, name_id, 
        date_of_birth, validation_image_url, approval_status, email_verified, 
        verification_token, verification_token_expires
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, NOW() + INTERVAL '24 hours')
      RETURNING user_id, username, email
    `, [
      username.trim(), hashedPassword, normalizedPhone,
      email?.trim() || null, roleId, addressId, nameId, dateOfBirth, proofImagePath, 'pending',
      verificationToken
    ]);

    console.log(`✅ New user registered: ${username} (ID: ${userResult.rows[0].user_id})`);

    // Create the full name
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    // Send verification email if email is provided
    if (email && email.trim()) {
      try {
        await sendVerificationEmail(email.trim(), fullName, verificationToken);
        console.log(`✅ Verification email sent to: ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError);
        // Don't fail registration if email sending fails
      }
    }

    // Create admin notification
    await createAdminNotification('New Resident Registration', `New resident registration submitted by ${fullName} (${username})`);

    res.json({
      success: true,
      message: email ? 
        'Registration submitted! Please check your email to verify your account. Your account is also pending admin approval.' :
        'Registration submitted! Your account is pending admin approval. You will be able to log in once approved.',
      user: {
        id: userResult.rows[0].user_id,
        username: userResult.rows[0].username,
        name: fullName,
        firstName: firstName,
        middleName: middleName || null,
        lastName: lastName,
        phone: normalizedPhone,
        address: fullAddress,
        barangay: barangay,
        city: city,
        street: street,
        subdivision: subdivision,
        block: block,
        lot: lot,
        emailVerificationRequired: !!email
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

    // Find user by username OR email with role information, approval status, and email verification
    const userResult = await pool.query(`
      SELECT u.user_id, u.username, u.password_hash, u.approval_status, u.rejection_reason, 
             u.role_id, r.role_name, u.email, u.email_verified
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = $1 OR u.email = $1
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

    // Check email verification if user has email
    if (user.email && !user.email_verified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        email: user.email
      });
    }

    // Block login if not approved (RESIDENTS ONLY)
    const isResident = (user.role_id === 3) || (user.role_name === 'resident');
    if (isResident && user.approval_status === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        message: 'Your account is pending approval by an admin.'
      });
    }

    if (isResident && user.approval_status === 'rejected') {
      return res.status(403).json({
        success: false,
        code: 'REJECTED',
        message: 'Your registration was rejected. Please contact support or re-apply.',
        rejection_reason: user.rejection_reason || null
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

// Get popular streets (all streets endpoint)
router.get('/streets', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT street_name as street, COUNT(*) as usage_count
      FROM addresses 
      WHERE street_name IS NOT NULL AND street_name != ''
      GROUP BY street_name 
      ORDER BY usage_count DESC, street_name
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    
    // Transform to dropdown format and add common street suggestions
    const streets = result.rows.map(row => ({
      label: row.street,
      value: row.street
    }));
    
    // Add common Philippine street names if not already present
    const commonStreets = [
      'Rizal Street', 'Bonifacio Street', 'Mabini Street', 'Luna Street',
      'Quezon Avenue', 'Maharlika Highway', 'National Highway',
      'Roxas Boulevard', 'EDSA', 'Commonwealth Avenue',
      'Main Street', 'First Street', 'Second Street', 'Third Street'
    ];
    
    commonStreets.forEach(street => {
      if (!streets.find(s => s.value.toLowerCase() === street.toLowerCase())) {
        streets.push({ label: street, value: street });
      }
    });
    
    res.json(streets);
  } catch (error) {
    console.error('Error fetching streets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch streets',
      message: error.message 
    });
  }
});

// Get popular streets by barangay
router.get('/streets/:barangayId', async (req, res) => {
  try {
    const { barangayId } = req.params;
    
    let query = `
      SELECT DISTINCT street_name as street, COUNT(*) as usage_count
      FROM addresses 
      WHERE street_name IS NOT NULL AND street_name != ''
    `;
    
    const params = [];
    if (barangayId && barangayId !== 'all') {
      query += ` AND barangay_id = $1`;
      params.push(barangayId);
    }
    
    query += `
      GROUP BY street_name 
      ORDER BY usage_count DESC, street_name
      LIMIT 50
    `;
    
    const result = await pool.query(query, params);
    
    // Transform to dropdown format and add common street suggestions
    const streets = result.rows.map(row => ({
      label: row.street,
      value: row.street
    }));
    
    // Add common Philippine street names if not already present
    const commonStreets = [
      'Rizal Street', 'Bonifacio Street', 'Mabini Street', 'Luna Street',
      'Quezon Avenue', 'Maharlika Highway', 'National Highway',
      'Roxas Boulevard', 'EDSA', 'Commonwealth Avenue',
      'Main Street', 'First Street', 'Second Street', 'Third Street'
    ];
    
    commonStreets.forEach(street => {
      if (!streets.find(s => s.value.toLowerCase() === street.toLowerCase())) {
        streets.push({ label: street, value: street });
      }
    });
    
    res.json(streets);
  } catch (error) {
    console.error('Error fetching streets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch streets',
      message: error.message 
    });
  }
});

// Get popular puroks (all puroks endpoint)
router.get('/puroks', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT purok_or_sitio as purok, COUNT(*) as usage_count
      FROM addresses 
      WHERE purok_or_sitio IS NOT NULL AND purok_or_sitio != ''
      GROUP BY purok_or_sitio 
      ORDER BY usage_count DESC, purok_or_sitio
      LIMIT 30
    `;
    
    const result = await pool.query(query);
    
    // Transform to dropdown format
    const puroks = result.rows.map(row => ({
      label: row.purok,
      value: row.purok
    }));
    
    // Add common purok patterns if not already present
    const commonPuroks = [
      'Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5',
      'Purok 6', 'Purok 7', 'Purok 8', 'Purok 9', 'Purok 10',
      'Purok Center', 'Purok Maligaya', 'Purok Riverside', 'Purok Hillside',
      'Purok Sunshine', 'Purok New', 'Purok Upper', 'Purok Lower'
    ];
    
    commonPuroks.forEach(purok => {
      if (!puroks.find(p => p.value.toLowerCase() === purok.toLowerCase())) {
        puroks.push({ label: purok, value: purok });
      }
    });
    
    res.json(puroks);
  } catch (error) {
    console.error('Error fetching puroks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch puroks',
      message: error.message 
    });
  }
});

// Get popular puroks by barangay
router.get('/puroks/:barangayId', async (req, res) => {
  try {
    const { barangayId } = req.params;
    
    let query = `
      SELECT DISTINCT purok_or_sitio as purok, COUNT(*) as usage_count
      FROM addresses 
      WHERE purok_or_sitio IS NOT NULL AND purok_or_sitio != ''
    `;
    
    const params = [];
    if (barangayId && barangayId !== 'all') {
      query += ` AND barangay_id = $1`;
      params.push(barangayId);
    }
    
    query += `
      GROUP BY purok_or_sitio 
      ORDER BY usage_count DESC, purok_or_sitio
      LIMIT 30
    `;
    
    const result = await pool.query(query, params);
    
    // Transform to dropdown format
    const puroks = result.rows.map(row => ({
      label: row.purok,
      value: row.purok
    }));
    
    // Add common purok patterns if not already present
    const commonPuroks = [
      'Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5',
      'Purok 6', 'Purok 7', 'Purok 8', 'Purok 9', 'Purok 10',
      'Purok Center', 'Purok Maligaya', 'Purok Riverside', 'Purok Hillside',
      'Purok Sunshine', 'Purok New', 'Purok Upper', 'Purok Lower'
    ];
    
    commonPuroks.forEach(purok => {
      if (!puroks.find(p => p.value.toLowerCase() === purok.toLowerCase())) {
        puroks.push({ label: purok, value: purok });
      }
    });
    
    res.json(puroks);
  } catch (error) {
    console.error('Error fetching puroks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch puroks',
      message: error.message 
    });
  }
});

module.exports = router;
