const express = require('express');
const router = express.Router();
const { sendApprovalEmail, sendRejectionEmail } = require('../services/emailService');

// Test approval email
router.post('/test-approval', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    console.log(`Testing approval email to: ${email}`);
    const result = await sendApprovalEmail(
      email, 
      firstName || 'Test', 
      lastName || 'User'
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Approval email sent successfully!', 
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send approval email', 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Test approval email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Test rejection email
router.post('/test-rejection', async (req, res) => {
  try {
    const { email, firstName, lastName, reason } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    console.log(`Testing rejection email to: ${email}`);
    const result = await sendRejectionEmail(
      email, 
      firstName || 'Test', 
      lastName || 'User',
      reason || 'This is a test rejection reason for testing purposes.'
    );

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Rejection email sent successfully!', 
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send rejection email', 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Test rejection email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Test basic SMTP connection
router.get('/test-connection', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY
      }
    });

    // Verify connection
    await transporter.verify();
    
    res.json({ 
      success: true, 
      message: 'SMTP connection successful!',
      config: {
        host: 'smtp-relay.brevo.com',
        port: 587,
        user: process.env.BREVO_SMTP_USER,
        sender: process.env.BREVO_SENDER_EMAIL
      }
    });
  } catch (error) {
    console.error('SMTP connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'SMTP connection failed', 
      error: error.message 
    });
  }
});

module.exports = router;
