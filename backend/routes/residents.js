const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT } = require('../middleware/auth');
const { sendRegistrationApprovalEmail, sendRegistrationRejectionEmail } = require('../services/notificationService');

// Server-side admin check using DB role lookup
async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const result = await pool.query(
      `SELECT r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [userId]
    );
    const roleName = result.rows[0]?.role_name;
    if (roleName !== 'admin') return res.status(403).json({ message: 'Forbidden: admin only' });
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// List pending residents only (role_id = 3)
router.get('/pending', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.contact_number,
        u.validation_image_url, u.created_at, u.approval_status,
        n.first_name, n.middle_name, n.last_name,
        a.full_address, a.block, a.lot, a.subdivision, a.street, a.city_municipality
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      WHERE u.approval_status = 'pending' AND u.role_id = 3
      ORDER BY u.created_at DESC`;
    const result = await pool.query(query);
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Error fetching pending residents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending residents', details: error.message });
  }
});

// Approve or reject a resident (role_id = 3)
router.post('/:user_id/approve', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { accept, reason } = req.body || {};
    const adminId = req.user.userId;

    console.log(`📥 Admin ${adminId} ${accept ? 'approving' : 'rejecting'} resident ID: ${user_id}`);

    // Get user details for email notification
    const userQuery = `
      SELECT u.email, un.first_name, un.last_name, u.approval_status
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1 AND u.role_id = 3
    `;
    
    console.log(`🔍 Fetching user details for ID: ${user_id}`);
    const userResult = await pool.query(userQuery, [user_id]);
    
    if (userResult.rows.length === 0) {
      console.log(`❌ Resident not found: ${user_id}`);
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }
    
    const user = userResult.rows[0];
    const userName = `${user.first_name || 'Unknown'} ${user.last_name || 'User'}`.trim();
    
    console.log(`👤 User found: ${userName} (${user.email})`);
    console.log(`📊 Current approval status: ${user.approval_status}`);

    if (accept === true) {
      console.log(`✅ Approving resident...`);
      const update = await pool.query(
        `UPDATE users
         SET approval_status = 'approved', 
             registration_status = 'approved',
             approved_at = NOW(), 
             approved_by = $1, 
             rejection_reason = NULL
         WHERE user_id = $2 AND role_id = 3
         RETURNING user_id`,
        [adminId, user_id]
      );
      
      if (update.rowCount === 0) {
        console.log(`❌ Failed to update resident: ${user_id}`);
        return res.status(404).json({ success: false, message: 'Resident not found' });
      }
      
      console.log(`✅ Resident status updated successfully`);
      
      // Send approval email notification
      if (user.email) {
        try {
          console.log(`📧 Sending approval email to: ${user.email}`);
          await sendRegistrationApprovalEmail(user.email, userName);
          console.log(`✅ Approval email sent successfully to: ${user.email}`);
        } catch (emailError) {
          console.error('❌ Failed to send approval email:', emailError);
          console.error('Email error details:', emailError.message);
          // Don't fail the approval if email fails
        }
      } else {
        console.log(`⚠️ No email found for user ${userName}, skipping email notification`);
      }
      
      return res.json({ 
        success: true, 
        message: `Resident approved. ${user.email ? 'Notification email sent.' : 'No email notification sent (no email address).'}` 
      });
    }

    if (accept === false) {
      console.log(`❌ Rejecting resident with reason: ${reason}`);
      const update = await pool.query(
        `UPDATE users
         SET approval_status = 'rejected', 
             registration_status = 'rejected',
             approved_at = NULL, 
             approved_by = $1, 
             rejection_reason = $2
         WHERE user_id = $3 AND role_id = 3
         RETURNING user_id`,
        [adminId, reason || null, user_id]
      );
      
      if (update.rowCount === 0) {
        console.log(`❌ Failed to update resident: ${user_id}`);
        return res.status(404).json({ success: false, message: 'Resident not found' });
      }
      
      console.log(`✅ Resident rejection updated successfully`);
      
      // Send rejection email notification
      if (user.email) {
        try {
          console.log(`📧 Sending rejection email to: ${user.email}`);
          await sendRegistrationRejectionEmail(user.email, userName, reason);
          console.log(`✅ Rejection email sent successfully to: ${user.email}`);
        } catch (emailError) {
          console.error('❌ Failed to send rejection email:', emailError);
          console.error('Email error details:', emailError.message);
          // Don't fail the rejection if email fails
        }
      } else {
        console.log(`⚠️ No email found for user ${userName}, skipping email notification`);
      }
      
      return res.json({ 
        success: true, 
        message: `Resident rejected. ${user.email ? 'Notification email sent.' : 'No email notification sent (no email address).'}` 
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid payload: accept must be true or false' });
  } catch (error) {
    console.error('❌ Error updating approval status:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to update approval status', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    console.log('Fetching residents...');
    const query = `
      SELECT 
        u.user_id, 
        u.user_id as resident_id, 
        u.username,
        u.email,
        u.approval_status,
        n.first_name, 
        n.middle_name, 
        n.last_name,
        u.contact_number, 
        a.street,
        a.subdivision,
        a.block,
        a.lot,
        a.full_address,
        b.barangay_name,
        a.city_municipality as city_name,
        'active' as subscription_status, 
        u.created_at,
        u.updated_at
      FROM users u 
      LEFT JOIN user_names n ON u.name_id = n.name_id 
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.role_id = 3 AND u.approval_status = 'approved'
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    console.log('Found ' + result.rows.length + ' approved residents');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({ error: 'Failed to fetch residents', details: error.message });
  }
});

router.put('/:resident_id', async (req, res) => {
  try {
    const { resident_id } = req.params;
    const { first_name, middle_name, last_name, contact_number, subscription_status, username, email } = req.body;
    console.log('Updating resident ' + resident_id);
    
    // First update the user info
    const updateUserQuery = 'UPDATE users SET username = $1, contact_number = $2, email = $3 WHERE user_id = $4 AND role_id = 3';
    await pool.query(updateUserQuery, [username, contact_number, email, resident_id]);
    
    // If name fields are provided, update the name table as well
    if (first_name || middle_name || last_name) {
      // Get the current name_id for this user
      const nameCheckQuery = 'SELECT name_id FROM users WHERE user_id = $1';
      const nameResult = await pool.query(nameCheckQuery, [resident_id]);
      
      if (nameResult.rows[0] && nameResult.rows[0].name_id) {
        // Update existing name record
        const updateNameQuery = 'UPDATE user_names SET first_name = $1, middle_name = $2, last_name = $3 WHERE name_id = $4';
        await pool.query(updateNameQuery, [first_name || '', middle_name || '', last_name || '', nameResult.rows[0].name_id]);
      }
    }
    
    console.log('Resident updated successfully');
    res.json({ success: true, message: 'Resident updated successfully' });
  } catch (error) {
    console.error('Error updating resident:', error);
    res.status(500).json({ error: 'Failed to update resident', details: error.message });
  }
});

router.delete('/:resident_id', async (req, res) => {
  try {
    const { resident_id } = req.params;
    console.log('Deleting resident ' + resident_id);
    
    const deleteQuery = 'DELETE FROM users WHERE user_id = $1 AND role_id = 3';
    const result = await pool.query(deleteQuery, [resident_id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Resident not found' });
    }
    
    console.log('Resident deleted successfully');
    res.json({ success: true, message: 'Resident deleted successfully' });
  } catch (error) {
    console.error('Error deleting resident:', error);
    res.status(500).json({ error: 'Failed to delete resident', details: error.message });
  }
});

// Get the authenticated resident's pinned home location (from user_locations)
router.get('/me/home-location', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const q = `
      SELECT latitude, longitude, captured_at as pinned_at, gate_image_url
      FROM user_locations
      WHERE user_id = $1 AND kind = 'home' AND is_current = true
      ORDER BY captured_at DESC
      LIMIT 1
    `;
    const result = await pool.query(q, [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Home location not set' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching home location:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch home location', details: error.message });
  }
});

// Set or update the authenticated resident's pinned home location with gate image (write to user_locations)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for gate image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/gate-images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: userId_timestamp.ext
    const userId = req.user?.userId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `gate_${userId}_${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

router.put('/me/home-location', authenticateJWT, upload.single('gateImage'), async (req, res) => {
  try {
    console.log('📥 PUT /me/home-location - Request received');
    const userId = req.user?.userId;
    console.log('👤 User ID:', userId);
    
    if (!userId) {
      console.log('❌ Unauthorized - no user ID');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('📦 Request body:', req.body);
    console.log('📎 File uploaded:', req.file ? `Yes - ${req.file.filename}` : 'No');
    
    let { latitude, longitude } = req.body || {};
    latitude = Number(latitude);
    longitude = Number(longitude);

    console.log('📍 Parsed coordinates:', { latitude, longitude });

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.log('❌ Invalid coordinates');
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.log('❌ Coordinates out of range');
      return res.status(400).json({ success: false, message: 'Coordinates out of range' });
    }

    // Handle gate image upload
    let gateImageUrl = null;
    if (req.file) {
      // Store relative path from uploads directory
      gateImageUrl = `/uploads/gate-images/${req.file.filename}`;
      console.log('✅ Gate image saved:', gateImageUrl);
    } else {
      console.log('⚠️ No gate image in request');
    }

    // Mark any previous 'home' locations as not current, then insert a new current row
    console.log('🔄 Updating previous home locations...');
    const updateResult = await pool.query(
      `UPDATE user_locations
       SET is_current = false
       WHERE user_id = $1 AND kind = 'home' AND is_current = true`,
      [userId]
    );
    console.log(`✅ Updated ${updateResult.rowCount} previous locations`);

    console.log('💾 Inserting new home location...');
    await pool.query(
      `INSERT INTO user_locations (user_id, kind, latitude, longitude, accuracy_m, source, captured_at, is_current, gate_image_url)
       VALUES ($1, 'home', $2, $3, NULL, 'app', NOW(), true, $4)`,
      [userId, latitude, longitude, gateImageUrl]
    );
    console.log('✅ New home location inserted successfully');

    const response = { 
      success: true, 
      message: 'Home location and gate image saved successfully',
      data: {
        latitude,
        longitude,
        gateImageUrl
      }
    };
    console.log('📤 Sending success response:', response);
    return res.json(response);
  } catch (error) {
    console.error('❌ Error saving home location:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    // Clean up uploaded file if database operation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: 'Failed to save home location', details: error.message });
  }
});

// Get locations for residents (for collectors to see on map)
router.get('/locations', authenticateJWT, async (req, res) => {
  try {
    const { user_ids } = req.query;
    
    let query = `
      SELECT 
        ul.user_id,
        ul.latitude,
        ul.longitude,
        ul.captured_at,
        un.first_name,
        un.last_name,
        a.full_address,
        a.street,
        a.subdivision
      FROM user_locations ul
      LEFT JOIN users u ON ul.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      WHERE ul.kind = 'home' 
        AND ul.is_current = true 
        AND u.role_id = 3
        AND u.approval_status = 'approved'
    `;
    
    let params = [];
    
    // If specific user_ids are requested, filter by them
    if (user_ids) {
      const userIdArray = user_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (userIdArray.length > 0) {
        query += ` AND ul.user_id = ANY($1)`;
        params.push(userIdArray);
      }
    }
    
    query += ` ORDER BY ul.captured_at DESC`;
    
    const result = await pool.query(query, params);
    
    const locations = result.rows.map(row => ({
      user_id: row.user_id,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || `User ${row.user_id}`,
      address: row.full_address || `${row.street || ''} ${row.subdivision || ''}`.trim() || 'Address not available',
      captured_at: row.captured_at
    }));
    
    res.json({ success: true, locations });
  } catch (error) {
    console.error('Error fetching resident locations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resident locations', details: error.message });
  }
});

module.exports = router;
