const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// Generate a secure random token
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Forgot password - send reset email
const forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!username) {
      return res.status(400).json({ 
        success: false,
        message: 'Username or email is required' 
      });
    }

    console.log('🔐 Forgot password request:', { username, ip: clientIp });

    // Find user by username OR email and get their email (residents only)
    const userResult = await pool.query(`
      SELECT u.user_id, u.username, u.email, un.first_name, un.last_name, r.role_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE (LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1))
      AND r.role_name = 'resident'
    `, [username.trim()]);

    // Always send success response to prevent user enumeration
    const genericResponse = {
      success: true,
      message: 'If an account with that username/email exists, a password reset link has been sent to the associated email address.'
    };

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(200).json(genericResponse);
    }

    const user = userResult.rows[0];
    
    // Check if user has an email address
    if (!user.email) {
      console.log(`❌ User ${username} has no email address`);
      return res.status(200).json(genericResponse);
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration

    console.log('📧 Generating password reset token for:', { 
      userId: user.user_id, 
      email: user.email,
      expiresAt 
    });

    // Clean up any existing tokens for this user (optional - prevents spam)
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.user_id]
    );

    // Insert new token into database
    await pool.query(`
      INSERT INTO password_reset_tokens (
        user_id, email, token, expires_at, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [user.user_id, user.email, token, expiresAt, clientIp, userAgent]);

    // Send password reset email
    try {
      const userName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;
      await sendPasswordResetEmail(user.email, userName, token);
      
      console.log(`✅ Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      
      // Clean up the token if email sending failed
      await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.'
      });
    }

    res.status(200).json(genericResponse);
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error. Please try again later.' 
    });
  }
};

// Reset password using email token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmNewPassword } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    console.log('🔐 Password reset request:', { token: token ? 'PROVIDED' : 'MISSING' });

    // Validate input
    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'Reset token is required' 
      });
    }

    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Both password fields are required' 
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate token and get user info
    console.log('🔍 Validating reset token...');
    const tokenResult = await pool.query(`
      SELECT prt.user_id, prt.email, prt.expires_at, prt.used_at,
             u.username, un.first_name, un.last_name
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE prt.token = $1
    `, [token]);

    if (tokenResult.rows.length === 0) {
      console.log('❌ Invalid token provided');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
    }

    const tokenData = tokenResult.rows[0];
    const { user_id: userId, expires_at: expiresAt, used_at: usedAt, email, username } = tokenData;

    // Check if token has already been used
    if (usedAt) {
      console.log('❌ Token already used');
      return res.status(400).json({ 
        success: false,
        message: 'This reset token has already been used' 
      });
    }

    // Check if token is expired
    if (new Date(expiresAt) < new Date()) {
      console.log('❌ Token expired');
      // Clean up expired token
      await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
      
      return res.status(400).json({ 
        success: false,
        message: 'Reset token has expired. Please request a new password reset.' 
      });
    }

    console.log('✅ Token validated for user:', { userId, username, email });

    // Hash new password with high salt rounds for security
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );

    // Mark token as used instead of deleting (for audit trail)
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );

    console.log(`✅ Password reset successful for user: ${username}`);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error. Please try again later.' 
    });
  }
};

module.exports = {
  forgotPassword,
  resetPassword
};
