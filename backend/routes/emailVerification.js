const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { sendVerificationEmail } = require('../services/emailService');
const crypto = require('crypto');

// Verify email endpoint
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  
  console.log(`🔍 Verification attempt with token: ${token ? token.substring(0, 10) + '...' : 'MISSING'}`);
  
  if (!token) {
    console.log('❌ No token provided');
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
    
    console.log(`🔍 Checking ${Object.keys(tempTokens).length} temporary tokens`);
    
    for (const [email, tokenData] of Object.entries(tempTokens)) {
      console.log(`🔍 Comparing with token for ${email}: ${tokenData.token.substring(0, 10)}...`);
      if (tokenData.token === token) {
        emailFound = email;
        console.log(`✅ Token match found for email: ${email}`);
        break;
      }
    }
    
    if (emailFound) {
      // Check if token has expired
      const tokenData = tempTokens[emailFound];
      if (new Date() > new Date(tokenData.expires)) {
        console.log(`❌ Token expired for ${emailFound}`);
        delete tempTokens[emailFound];
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
      
      // Mark as verified in temporary storage
      tempTokens[emailFound].verified = true;
      tempTokens[emailFound].verifiedAt = new Date();
      
      // CRITICAL FIX: Update database email_verified status
      try {
        const { pool } = require('../config/db');
        await pool.query(
          'UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE email = $1',
          [emailFound]
        );
        console.log('✅ Database email_verified updated for:', emailFound);
      } catch (dbError) {
        console.error('❌ Failed to update database email_verified:', dbError.message);
        // Continue anyway - temporary verification still works
      }
      
      // Enhanced production logging for Render
      console.log('🎉 ===== EMAIL VERIFICATION SUCCESS =====');
      console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Email verified successfully: ${emailFound}`);
      console.log(`🔑 Token verified: ${token}`);
      console.log(`⏰ Verified at: ${new Date().toISOString()}`);
      console.log(`🌐 User IP: ${req.ip || req.connection.remoteAddress}`);
      console.log(`📱 User Agent: ${req.get('User-Agent')}`);
      console.log('🎯 User can now continue registration in mobile app');
      console.log('🎉 ===== EMAIL VERIFICATION COMPLETE =====');
      
      return res.status(200).send(`
        <html>
          <head>
            <title>Email Verification - WSBS</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
              }
              .success-icon {
                font-size: 64px;
                margin-bottom: 20px;
              }
              h1 {
                color: #27ae60;
                margin-bottom: 16px;
                font-size: 28px;
              }
              p {
                color: #666;
                line-height: 1.6;
                margin-bottom: 20px;
              }
              .email {
                color: #4CAF50;
                font-weight: bold;
              }
              .instructions {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #4CAF50;
              }
              .btn {
                background: #4CAF50;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin: 10px;
                transition: background 0.3s;
              }
              .btn:hover {
                background: #45a049;
              }
              .btn-secondary {
                background: #6c757d;
              }
              .btn-secondary:hover {
                background: #5a6268;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h1>Email Verified Successfully!</h1>
              <p>Your email <span class="email">${emailFound}</span> has been verified.</p>
              
              <div class="instructions">
                <strong>Next Steps:</strong>
                <p>1. Return to the WSBS mobile app<br>
                2. Continue with your registration<br>
                3. Complete the remaining steps</p>
              </div>
              
              <div>
                <button class="btn" onclick="window.close()">Close Window</button>
                <button class="btn btn-secondary" onclick="goBackToApp()">Back to App</button>
              </div>
              
              <script>
                function goBackToApp() {
                  // Try to redirect to app if possible
                  window.location.href = 'wsbs://verified?email=${encodeURIComponent(emailFound)}';
                  // Fallback: close window after a delay
                  setTimeout(() => {
                    window.close();
                  }, 2000);
                }
                
                // Auto-close after 30 seconds
                setTimeout(() => {
                  window.close();
                }, 30000);
              </script>
            </div>
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


// Combined verification status (temp + database)
router.post('/combined-verification-status', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    const trimmed = email.trim();
    const tempTokens = global.tempVerificationTokens || {};
    const tokenData = tempTokens[trimmed];

    const tempInfo = {
      existsInTemp: !!tokenData,
      tempVerified: !!(tokenData && tokenData.verified),
      tempExpiresAt: tokenData?.expires || null
    };

    // Query database for user email verification
    const dbQuery = `
      SELECT user_id, email_verified, verification_token IS NOT NULL AS has_verification_token
      FROM users
      WHERE email = $1
    `;
    const dbResult = await pool.query(dbQuery, [trimmed]);
    const dbUser = dbResult.rows[0] || null;

    const dbInfo = {
      dbUserFound: !!dbUser,
      dbEmailVerified: dbUser ? !!dbUser.email_verified : false,
      hasVerificationToken: dbUser ? !!dbUser.has_verification_token : false
    };

    const overallVerified = tempInfo.tempVerified || dbInfo.dbEmailVerified;
    const source = overallVerified
      ? (dbInfo.dbEmailVerified ? 'database' : 'temporary')
      : 'none';

    return res.status(200).json({
      success: true,
      email: trimmed,
      ...tempInfo,
      ...dbInfo,
      overallVerified,
      source
    });
  } catch (error) {
    console.error('Combined verification status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get combined verification status'
    });
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
  
  console.log(`📧 Email verification request received for: ${email}, name: ${name}`);
  
  if (!email || !name) {
    console.log('❌ Missing email or name in request');
    return res.status(400).json({ 
      success: false, 
      message: 'Email and name are required' 
    });
  }

  try {
    // Check if email already has a recent verification
    global.tempVerificationTokens = global.tempVerificationTokens || {};
    const existing = global.tempVerificationTokens[email];
    
    if (existing && existing.verified) {
      console.log(`✅ Email ${email} is already verified`);
      return res.status(200).json({ 
        success: true, 
        message: 'Email is already verified.' 
      });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store token temporarily
    global.tempVerificationTokens[email] = {
      token: verificationToken,
      expires: tokenExpires,
      verified: false,
      name: name
    };
    
    console.log(`🔗 Storing temp token for ${email}: ${verificationToken.substring(0, 10)}...`);
    
    // Send verification email
    console.log(`📤 Attempting to send verification email to: ${email}`);
    const emailResult = await sendVerificationEmail(email, name, verificationToken);
    
    if (emailResult.success) {
      console.log(`✅ Verification email sent successfully to: ${email}`);
      
      res.status(200).json({ 
        success: true, 
        message: 'Verification email sent successfully. Please check your inbox.',
        debug: {
          tokenPreview: verificationToken.substring(0, 10) + '...',
          expires: tokenExpires,
          recipient: emailResult.recipient,
          messageId: emailResult.messageId
        }
      });
    } else {
      console.error(`❌ Failed to send email to ${email}:`, emailResult.error);
      
      // Provide specific error messages based on the type of failure
      let userMessage = 'Failed to send verification email. Please try again.';
      
      if (emailResult.missingConfig) {
        userMessage = 'Email service is currently unavailable. Please contact support.';
        console.error('🚨 ADMIN ACTION REQUIRED: Configure SMTP environment variables');
      } else if (emailResult.error?.includes('Invalid login')) {
        userMessage = 'Email service configuration error. Please contact support.';
        console.error('🚨 ADMIN ACTION REQUIRED: Check SMTP credentials');
      }
      
      res.status(500).json({ 
        success: false, 
        message: userMessage,
        error: emailResult.error,
        recipient: emailResult.recipient
      });
    }
    
  } catch (error) {
    console.error('❌ Send verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send verification email. Please try again.',
      error: error.message
    });
  }
});

// Check verification status endpoint
router.post('/check-verification-status', async (req, res) => {
  const { email } = req.body;
  
  console.log(`🔍 Checking verification status for: ${email}`);
  
  if (!email) {
    console.log('❌ No email provided for verification status check');
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    // Check temporary verification status
    const tempTokens = global.tempVerificationTokens || {};
    const tokenData = tempTokens[email];
    
    console.log(`🔍 Token data for ${email}:`, tokenData ? 'Found' : 'Not found');
    
    if (!tokenData) {
      console.log(`❌ No verification request found for ${email}`);
      return res.status(404).json({ 
        success: false, 
        verified: false,
        message: 'No verification request found for this email' 
      });
    }
    
    // Check if token has expired
    if (new Date() > new Date(tokenData.expires)) {
      console.log(`⏰ Verification token expired for ${email}`);
      delete tempTokens[email];
      return res.status(400).json({ 
        success: false, 
        verified: false,
        message: 'Verification token has expired. Please request a new one.' 
      });
    }
    
    console.log(`✅ Verification status for ${email}: ${tokenData.verified ? 'VERIFIED' : 'PENDING'}`);
    
    res.status(200).json({ 
      success: true, 
      verified: tokenData.verified,
      message: tokenData.verified ? 'Email verified successfully!' : 'Email not yet verified'
    });
    
  } catch (error) {
    console.error('❌ Check verification status error:', error);
    res.status(500).json({ 
      success: false, 
      verified: false,
      message: 'Failed to check verification status. Please try again.' 
    });
  }
});


module.exports = router;
