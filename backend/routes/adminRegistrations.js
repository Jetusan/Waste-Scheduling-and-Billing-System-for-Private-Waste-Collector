const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { sendRegistrationApprovalEmail, sendRegistrationRejectionEmail } = require('../services/notificationService');

// Get all pending registrations for admin review
router.get('/pending', async (req, res) => {
  try {
    console.log('📥 Admin requesting pending registrations...');
    
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.contact_number,
        u.email_verified,
        u.created_at,
        COALESCE(un.first_name, 'Unknown') as first_name,
        un.middle_name,
        COALESCE(un.last_name, 'User') as last_name,
        COALESCE(a.street, '') as street,
        COALESCE(a.block, '') as block,
        COALESCE(a.lot, '') as lot,
        COALESCE(a.subdivision, '') as subdivision,
        COALESCE(b.barangay_name, 'Unknown Barangay') as barangay_name,
        COALESCE(a.city_municipality, 'General Santos City') as city_name,
        COALESCE(a.full_address, 'No address provided') as full_address,
        u.validation_image_url,
        u.registration_status,
        u.approval_status
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.registration_status = 'pending' 
      AND u.approval_status = 'pending'
      AND u.email IS NOT NULL
      ORDER BY u.created_at DESC
    `;
    
    console.log('🔍 Executing pending registrations query...');
    const result = await pool.query(query);
    console.log(`📊 Found ${result.rows.length} pending registrations`);
    
    const registrations = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      email: row.email,
      contactNumber: row.contact_number,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      name: `${row.first_name}${row.middle_name ? ' ' + row.middle_name : ''} ${row.last_name}`.trim(),
      address: row.full_address || `${[row.street, row.block ? 'Block ' + row.block : '', row.lot ? 'Lot ' + row.lot : '', row.subdivision, row.barangay_name, row.city_name].filter(Boolean).join(', ')}`,
      proofImagePath: row.validation_image_url,
      status: row.registration_status,
      approvalStatus: row.approval_status,
      // Additional address details for admin
      addressDetails: {
        street: row.street,
        block: row.block,
        lot: row.lot,
        subdivision: row.subdivision,
        barangay: row.barangay_name,
        city: row.city_name
      }
    }));
    
    console.log(`✅ Returning ${registrations.length} pending registrations to admin`);
    res.json({ 
      success: true, 
      registrations,
      count: registrations.length
    });
  } catch (error) {
    console.error('❌ Error fetching pending registrations:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending registrations',
      error: error.message
    });
  }
});

// Approve a registration
router.post('/approve/:userId', async (req, res) => {
  const { userId } = req.params;
  
  console.log(`📥 Admin approval request for user ID: ${userId}`);
  
  try {
    // Get user details for email notification
    const userQuery = `
      SELECT u.email, un.first_name, un.last_name, u.registration_status, u.approval_status
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1
    `;
    
    console.log(`🔍 Fetching user details for ID: ${userId}`);
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = userResult.rows[0];
    const userName = `${user.first_name || 'Unknown'} ${user.last_name || 'User'}`.trim();
    
    console.log(`👤 User found: ${userName} (${user.email})`);
    console.log(`📊 Current status - Registration: ${user.registration_status}, Approval: ${user.approval_status}`);
    
    // Update both registration_status and approval_status
    const updateQuery = `
      UPDATE users 
      SET registration_status = 'approved', 
          approval_status = 'approved',
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;
    
    console.log(`🔄 Updating user status to approved...`);
    await pool.query(updateQuery, [userId]);
    console.log(`✅ User status updated successfully`);
    
    // Send approval email notification
    if (user.email) {
      try {
        console.log(`📧 Sending approval email to: ${user.email}`);
        await sendRegistrationApprovalEmail(user.email, userName);
        console.log(`✅ Registration approved and email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send approval email:', emailError);
        console.error('Email error details:', emailError.message);
        // Don't fail the approval if email fails
      }
    } else {
      console.log(`⚠️ No email found for user ${userName}, skipping email notification`);
    }
    
    res.json({ 
      success: true, 
      message: `Registration approved for ${userName}. ${user.email ? 'Notification email sent.' : 'No email notification sent (no email address).'}` 
    });
    
  } catch (error) {
    console.error('❌ Error approving registration:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve registration',
      error: error.message
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
