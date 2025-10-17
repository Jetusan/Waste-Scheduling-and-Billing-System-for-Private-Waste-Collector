const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const bcrypt = require('bcrypt');

// GET all collectors (users with role_id=2 that have a collectors row)
router.get('/', async (req, res) => {
  try {
    console.log('Fetching collectors...');
    const query = `
      SELECT 
        u.user_id,
        c.collector_id,
        u.username,
        n.first_name,
        n.middle_name,
        n.last_name,
        u.contact_number,
        u.email,
        c.status as employment_status,
        c.license_number,
        c.license_expiry_date,
        c.truck_id,
        t.truck_number,
        t.plate_number,
        'Collection Department' as department,
        u.created_at
      FROM users u
      JOIN collectors c ON c.user_id = u.user_id
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN trucks t ON c.truck_id = t.truck_id
      WHERE u.role_id = 2
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    console.log('Found ' + result.rows.length + ' collectors');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching collectors:', error);
    res.status(500).json({ error: 'Failed to fetch collectors', details: error.message });
  }
});

// UPDATE a collector by ID
router.put('/:collector_id', async (req, res) => {
  try {
    const { collector_id } = req.params;
    const { first_name, middle_name, last_name, contact_number, email, username, employment_status } = req.body;
    console.log('Updating collector ' + collector_id);
    
    // First update the user info
    const updateUserQuery = 'UPDATE users SET username = $1, contact_number = $2, email = $3 WHERE user_id = $4 AND role_id = 2';
    await pool.query(updateUserQuery, [username, contact_number, email, collector_id]);
    
    // If name fields are provided, update the name table as well
    if (first_name || middle_name || last_name) {
      // Get the current name_id for this user
      const nameCheckQuery = 'SELECT name_id FROM users WHERE user_id = $1';
      const nameResult = await pool.query(nameCheckQuery, [collector_id]);
      
      if (nameResult.rows[0] && nameResult.rows[0].name_id) {
        // Update existing name record
        const updateNameQuery = 'UPDATE user_names SET first_name = $1, middle_name = $2, last_name = $3 WHERE name_id = $4';
        await pool.query(updateNameQuery, [first_name || '', middle_name || '', last_name || '', nameResult.rows[0].name_id]);
      }
    }
    
    console.log('Collector updated successfully');
    res.json({ success: true, message: 'Collector updated successfully' });
  } catch (error) {
    console.error('Error updating collector:', error);
    res.status(500).json({ error: 'Failed to update collector', details: error.message });
  }
});

// DELETE a collector by ID
router.delete('/:collector_id', async (req, res) => {
  try {
    const { collector_id } = req.params;
    console.log('Deleting collector ' + collector_id);
    
    const deleteQuery = 'DELETE FROM users WHERE user_id = $1 AND role_id = 2';
    const result = await pool.query(deleteQuery, [collector_id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Collector not found' });
    }
    
    console.log('Collector deleted successfully');
    res.json({ success: true, message: 'Collector deleted successfully' });
  } catch (error) {
    console.error('Error deleting collector:', error);
    res.status(500).json({ error: 'Failed to delete collector', details: error.message });
  }
});

// POST - Register new collector (for admin use)
router.post('/register-optimized', async (req, res) => {
  try {
    const {
      firstName, middleName, lastName,
      username, contactNumber, password,
      city, barangay, street, houseNumber, purok, landmark, email,
      license_number, license_expiry_date, truck_id, status, role
    } = req.body;

    console.log('🚀 Starting collector registration...');

    // Validate required fields
    const missingFields = [];
    if (!firstName?.trim()) missingFields.push('firstName');
    if (!lastName?.trim()) missingFields.push('lastName');
    if (!username?.trim()) missingFields.push('username');
    if (!contactNumber?.trim()) missingFields.push('contactNumber');
    if (!password) missingFields.push('password');
    if (!barangay?.trim()) missingFields.push('barangay');
    if (!license_number?.trim()) missingFields.push('license_number');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields',
        errors: missingFields
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

    // Get collector role ID
    const roleResult = await pool.query(
      'SELECT role_id FROM roles WHERE role_name = $1',
      ['collector']
    );

    if (roleResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'System error: collector role not found'
      });
    }

    const roleId = roleResult.rows[0].role_id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Use transaction to prevent partial records
    const client = await pool.connect();
    let userId, collectorId;

    try {
      await client.query('BEGIN');

      // Create name record first
      const nameResult = await client.query(`
        INSERT INTO user_names (first_name, middle_name, last_name)
        VALUES ($1, $2, $3)
        RETURNING name_id
      `, [firstName.trim(), middleName?.trim() || null, lastName.trim()]);

      const nameId = nameResult.rows[0].name_id;

      // Create address
      const fullAddress = [houseNumber, street, purok, barangay, city].filter(Boolean).join(', ');
      
      const addressResult = await client.query(`
        INSERT INTO addresses (
          street, barangay_id, city_municipality, address_type, full_address
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING address_id
      `, [street?.trim() || null, barangayId, city, 'residential', fullAddress]);

      const addressId = addressResult.rows[0].address_id;

      // Create user account (collectors are auto-approved)
      const userResult = await client.query(`
        INSERT INTO users (
          username, password_hash, contact_number, email, role_id, 
          address_id, name_id, approval_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING user_id, username
      `, [
        username.trim(), hashedPassword, contactNumber.trim(),
        email?.trim() || null, roleId, addressId, nameId, 'approved'
      ]);

      userId = userResult.rows[0].user_id;

      // Create collector record
      const collectorResult = await client.query(`
        INSERT INTO collectors (
          user_id, truck_id, license_number, license_expiry_date, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING collector_id
      `, [
        userId, 
        truck_id ? parseInt(truck_id) : null, 
        license_number.trim(), 
        license_expiry_date || null, 
        status || 'active'
      ]);

      collectorId = collectorResult.rows[0].collector_id;

      await client.query('COMMIT');
      
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

    console.log(`✅ New collector registered: ${username} (ID: ${userId})`);

    res.json({
      success: true,
      message: 'Collector registered successfully',
      collector: {
        id: userId,
        collector_id: collectorId,
        username: username.trim(),
        name: [firstName, middleName, lastName].filter(Boolean).join(' ')
      }
    });

  } catch (error) {
    console.error('❌ Collector registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST - Send OTP to collector for password reset
router.post('/send-otp', async (req, res) => {
  try {
    const { username, contact_number } = req.body;

    if (!username || !contact_number) {
      return res.status(400).json({
        success: false,
        message: 'Username and contact number are required'
      });
    }

    // Verify collector and get email
    const verifyResult = await pool.query(`
      SELECT u.user_id, u.username, u.contact_number, u.email, un.first_name, un.last_name
      FROM users u
      JOIN collectors c ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE LOWER(u.username) = LOWER($1) 
      AND u.contact_number = $2 
      AND u.role_id = 2
    `, [username.trim(), contact_number.trim()]);

    if (verifyResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username or contact number'
      });
    }

    const collector = verifyResult.rows[0];
    
    if (!collector.email) {
      return res.status(400).json({
        success: false,
        message: 'No email address found for this collector'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Clean up existing tokens
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [collector.user_id]);

    // Store OTP
    await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [collector.user_id, otp, expiresAt]);

    // Send OTP email
    const { sendPasswordResetEmail } = require('../services/emailService');
    const userName = collector.first_name ? `${collector.first_name} ${collector.last_name || ''}`.trim() : collector.username;
    
    await sendPasswordResetEmail(collector.email, userName, otp);

    console.log(`✅ OTP sent to collector: ${username}`);

    res.json({
      success: true,
      message: 'Reset code sent to your email'
    });

  } catch (error) {
    console.error('❌ Collector identity verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST - Self password reset for collectors
router.post('/self-reset-password', async (req, res) => {
  try {
    const { username, contact_number, new_password } = req.body;

    if (!username || !contact_number || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Username, contact number, and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Verify collector identity again for security
    const verifyResult = await pool.query(`
      SELECT u.user_id, u.username
      FROM users u
      JOIN collectors c ON c.user_id = u.user_id
      WHERE LOWER(u.username) = LOWER($1) 
      AND u.contact_number = $2 
      AND u.role_id = 2
    `, [username.trim(), contact_number.trim()]);

    if (verifyResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const userId = verifyResult.rows[0].user_id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update collector's password
    const updateResult = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );

    console.log(`✅ Self password reset successful for collector: ${username}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('❌ Collector self password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST - Reset collector password (admin only)
router.post('/reset-password', async (req, res) => {
  try {
    const { collector_id, new_password } = req.body;

    if (!collector_id || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Collector ID and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update collector's password
    const updateResult = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND role_id = 2',
      [hashedPassword, collector_id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collector not found'
      });
    }

    console.log(`✅ Password reset for collector ID: ${collector_id}`);

    res.json({
      success: true,
      message: 'Collector password reset successfully'
    });

  } catch (error) {
    console.error('❌ Collector password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
