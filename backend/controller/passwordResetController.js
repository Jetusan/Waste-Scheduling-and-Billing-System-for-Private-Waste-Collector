const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Generate a random token
const generateToken = () => {
  return uuidv4();
};

// Forgot password - generate reset token
const forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Check if user exists in the users table
    console.log('Forgot password request for username:', username);
    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    console.log('User query result:', userResult.rows);
    if (userResult.rows.length === 0) {
      // To prevent username enumeration, we send a generic success-like message
      // even if the user is not found. The user will simply not receive a token.
      console.log(`User "${username}" not found, sending generic response.`);
      return res.status(200).json({
        success: true,
        message: 'If an account with that username exists, a password reset token has been generated.'
      });
    }

    const userId = userResult.rows[0].user_id;
    const token = generateToken();
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 3600000);

    console.log('Inserting token into database:', { userId, token, expiresAt });
    // Insert token into database
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // In a real application, you would send an email with the reset link
    // For now, we'll just return the token in the response for testing
    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully',
      resetToken: token
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmNewPassword } = req.body;
    console.log('Reset password request:', { token, newPassword, confirmNewPassword });

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: 'Both password fields are required' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if token exists and is valid
    console.log('Validating reset token:', token);
    const tokenResult = await pool.query(
      'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    console.log('Token validation result:', tokenResult.rows);
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const { user_id: userId, expires_at: expiresAt } = tokenResult.rows[0];

    // Check if token is expired
    if (new Date(expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12); // Increased salt rounds

    console.log('Updating password for user:', userId);
    // Update user's password in the users table
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );

    console.log('Deleting used token:', token);
    // Delete used token
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

module.exports = {
  forgotPassword,
  resetPassword
};
