const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { sendRegistrationApprovalEmail, sendRegistrationRejectionEmail } = require('../services/notificationService');

// Get all pending registrations for admin review
router.get('/pending', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.contact_number,
        u.email_verified,
        u.created_at,
        un.first_name,
        un.middle_name,
        un.last_name,
        a.street,
        a.house_number,
        a.purok,
        b.barangay_name,
        c.city_name,
        u.proof_image_path,
        u.registration_status
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN cities c ON a.city_id = c.city_id
      WHERE u.registration_status = 'pending' 
      AND u.email_verified = true
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    const registrations = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      email: row.email,
      contactNumber: row.contact_number,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      name: `${row.first_name} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name}`,
      address: `${row.street}${row.house_number ? ', ' + row.house_number : ''}${row.purok ? ', Purok ' + row.purok : ''}, ${row.barangay_name}, ${row.city_name}`,
      proofImagePath: row.proof_image_path,
      status: row.registration_status
    }));
    
    res.json({ success: true, registrations });
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending registrations' });
  }
});

// Approve a registration
router.post('/approve/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Get user details for email notification
    const userQuery = `
      SELECT u.email, un.first_name, un.last_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1 AND u.registration_status = 'pending'
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found or already processed' 
      });
    }
    
    const user = userResult.rows[0];
    const userName = `${user.first_name} ${user.last_name}`;
    
    // Update registration status to approved
    const updateQuery = `
      UPDATE users 
      SET registration_status = 'approved', 
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;
    
    await pool.query(updateQuery, [userId]);
    
    // Send approval email notification
    try {
      await sendRegistrationApprovalEmail(user.email, userName);
      console.log(`✅ Registration approved and email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the approval if email fails
    }
    
    res.json({ 
      success: true, 
      message: `Registration approved for ${userName}. Notification email sent.` 
    });
    
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve registration' 
    });
  }
});

// Reject a registration
router.post('/reject/:userId', async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  
  try {
    // Get user details for email notification
    const userQuery = `
      SELECT u.email, un.first_name, un.last_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1 AND u.registration_status = 'pending'
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found or already processed' 
      });
    }
    
    const user = userResult.rows[0];
    const userName = `${user.first_name} ${user.last_name}`;
    
    // Update registration status to rejected
    const updateQuery = `
      UPDATE users 
      SET registration_status = 'rejected', 
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;
    
    await pool.query(updateQuery, [userId, reason || null]);
    
    // Send rejection email notification
    try {
      await sendRegistrationRejectionEmail(user.email, userName, reason);
      console.log(`✅ Registration rejected and email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }
    
    res.json({ 
      success: true, 
      message: `Registration rejected for ${userName}. Notification email sent.` 
    });
    
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject registration' 
    });
  }
});

// Get registration statistics
router.get('/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        registration_status,
        COUNT(*) as count
      FROM users 
      WHERE role_id = 2 -- Only residents
      GROUP BY registration_status
    `;
    
    const result = await pool.query(query);
    
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };
    
    result.rows.forEach(row => {
      stats[row.registration_status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching registration stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

module.exports = router;
