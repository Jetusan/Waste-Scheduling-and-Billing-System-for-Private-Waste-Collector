const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { sendVerificationEmail } = require('../services/emailService');
const crypto = require('crypto');

// Verify email endpoint
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send(`
      <html>
        <head><title>Email Verification</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #e74c3c;">❌ Verification Failed</h2>
          <p>Verification token is required</p>
          <p><a href="#" onclick="window.close()">Close this window</a></p>
        </body>
      </html>
    `);
  }

  try {
    // Check temporary tokens first (for registration flow)
    const tempTokens = global.tempVerificationTokens || {};
    let emailFound = null;
    
    for (const [email, tokenData] of Object.entries(tempTokens)) {
      if (tokenData.token === token) {
        emailFound = email;
        break;
      }
    }
    
    if (emailFound) {
      // Mark as verified in temporary storage
      tempTokens[emailFound].verified = true;
      
      return res.status(200).send(`
        <html>
          <head><title>Email Verification</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #27ae60;">✅ Email Verified Successfully!</h2>
            <p>Your email has been verified. You can now continue with registration in the WSBS app.</p>
            <p><a href="#" onclick="window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }
    
    // If not found in temporary storage, check database (for existing users)
    const query = `
      SELECT user_id, email, email_verified, verification_token_expires 
      FROM users 
      WHERE verification_token = $1
    `;
    
    const result = await pool.query(query, [token]);
    
    if (result.rows.length === 0) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">❌ Verification Failed</h2>
            <p>Invalid verification token</p>
            <p><a href="#" onclick="window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }
    
    const user = result.rows[0];
    
    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">❌ Verification Failed</h2>
            <p>Verification token has expired. Please request a new verification email.</p>
            <p><a href="#" onclick="window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }
    
    // Check if already verified
    if (user.email_verified) {
      return res.status(200).send(`
        <html>
          <head><title>Email Verification</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #27ae60;">✅ Already Verified</h2>
            <p>Email is already verified. You can now log in to your account.</p>
            <p><a href="#" onclick="window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }
    
    // Update user as verified
    const updateQuery = `
      UPDATE users 
      SET email_verified = true, 
          verification_token = NULL, 
          verification_token_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;
    
    await pool.query(updateQuery, [user.user_id]);
    
    console.log(`✅ Email verified for user: ${user.email}`);
    
    res.status(200).send(`
      <html>
        <head><title>Email Verification</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #27ae60;">✅ Email Verified Successfully!</h2>
          <p>Your email has been verified successfully! You can now log in to your account.</p>
          <p><a href="#" onclick="window.close()">Close this window</a></p>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).send(`
      <html>
        <head><title>Email Verification</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #e74c3c;">❌ Verification Failed</h2>
          <p>Email verification failed. Please try again.</p>
          <p><a href="#" onclick="window.close()">Close this window</a></p>
        </body>
      </html>
    `);
  }
});

// Resend verification email endpoint
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    // Find user by email
    const query = `
      SELECT user_id, first_name, last_name, email, email_verified 
      FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email address' 
      });
    }
    
    const user = result.rows[0];
    
    if (user.email_verified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already verified' 
      });
    }
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Update user with new token
    const updateQuery = `
      UPDATE users 
      SET verification_token = $1, 
          verification_token_expires = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3
    `;
    
    await pool.query(updateQuery, [verificationToken, tokenExpires, user.user_id]);
    
    // Send verification email
    const userName = `${user.first_name} ${user.last_name}`;
    await sendVerificationEmail(user.email, userName, verificationToken);
    
    console.log(`✅ Verification email resent to: ${user.email}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Verification email sent successfully. Please check your inbox.' 
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resend verification email. Please try again.' 
    });
  }
});

// Send verification email endpoint (for registration flow)
router.post('/send-verification', async (req, res) => {
  const { email, name } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and name are required' 
    });
  }

  try {
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store token temporarily (you might want to use a temporary table or cache)
    // For now, we'll store it in a simple in-memory object (not production-ready)
    global.tempVerificationTokens = global.tempVerificationTokens || {};
    global.tempVerificationTokens[email] = {
      token: verificationToken,
      expires: tokenExpires,
      verified: false
    };
    
    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);
    
    console.log(`✅ Verification email sent to: ${email}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Verification email sent successfully. Please check your inbox.' 
    });
    
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send verification email. Please try again.' 
    });
  }
});

// Check verification status endpoint
router.post('/check-verification-status', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    // Check temporary verification status
    const tempTokens = global.tempVerificationTokens || {};
    const tokenData = tempTokens[email];
    
    if (!tokenData) {
      return res.status(404).json({ 
        success: false, 
        verified: false,
        message: 'No verification request found for this email' 
      });
    }
    
    // Check if token has expired
    if (new Date() > new Date(tokenData.expires)) {
      delete tempTokens[email];
      return res.status(400).json({ 
        success: false, 
        verified: false,
        message: 'Verification token has expired. Please request a new one.' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      verified: tokenData.verified,
      message: tokenData.verified ? 'Email verified successfully!' : 'Email not yet verified'
    });
    
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({ 
      success: false, 
      verified: false,
      message: 'Failed to check verification status. Please try again.' 
    });
  }
});


module.exports = router;
