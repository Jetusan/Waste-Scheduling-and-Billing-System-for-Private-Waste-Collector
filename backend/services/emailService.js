// backend/services/emailService.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
const API_CONFIG = require('../config/config');

// Helper to get the Brevo transactional email client
const getTransactionalEmailApi = () => {
  if (!process.env.BREVO_API_KEY) {
    console.log('⚠️ Brevo API key not configured - email service disabled');
    console.log('Set BREVO_API_KEY in environment variables to enable Brevo transactional emails');
    return null;
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  return new SibApiV3Sdk.TransactionalEmailsApi();
};

const getSenderDetails = () => {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_SMTP_USER;

  if (!senderEmail) {
    console.log('⚠️ No Brevo sender email configured. Set BREVO_SENDER_EMAIL or BREVO_SMTP_USER.');
  }

  return {
    name: process.env.BREVO_SENDER_NAME || 'WSBS',
    email: senderEmail
  };
};

// Email templates
const getApprovalEmailTemplate = (firstName, lastName) => {
  return {
    subject: 'WSBS Registration Approved - Welcome!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c7be5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-icon { font-size: 48px; color: #28a745; text-align: center; margin-bottom: 20px; }
          .button { background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>WSBS - Waste Management System</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2>Registration Approved!</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Congratulations! Your registration with the Waste Management System has been <strong>approved</strong> by our admin team.</p>
            <p>You can now:</p>
            <ul>
              <li>Log in to your account using your registered credentials</li>
              <li>Access waste collection services</li>
              <li>View collection schedules</li>
              <li>Submit special pickup requests</li>
              <li>Track your waste collection history</li>
            </ul>
            <p>Welcome to our waste management community! We're committed to providing you with efficient and reliable waste collection services.</p>
            <div class="footer">
              <p>Thank you for choosing WSBS Waste Management System</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const getRejectionEmailTemplate = (firstName, lastName, reason) => {
  return {
    subject: 'WSBS Registration Update Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-icon { font-size: 48px; color: #ffc107; text-align: center; margin-bottom: 20px; }
          .reason-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>WSBS - Waste Management System</h1>
          </div>
          <div class="content">
            <div class="warning-icon">⚠️</div>
            <h2>Registration Requires Review</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Thank you for your interest in registering with our Waste Management System. After reviewing your application, we need you to address the following:</p>
            ${reason ? `
              <div class="reason-box">
                <strong>Reason for Review:</strong><br>
                ${reason}
              </div>
            ` : ''}
            <p>To complete your registration, please:</p>
            <ul>
              <li>Review the information you provided</li>
              <li>Ensure all required documents are clear and valid</li>
              <li>Contact our support team if you need assistance</li>
              <li>Resubmit your application with the necessary corrections</li>
            </ul>
            <p>We appreciate your understanding and look forward to serving you once your registration is complete.</p>
            <div class="footer">
              <p>WSBS Waste Management System</p>
              <p>For assistance, please contact our support team.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const sendVerificationEmail = async (email, name, verificationToken) => {
  // Use URL configuration helper
  const { buildVerificationLink } = require('../config/urlConfig');
  const verificationLink = buildVerificationLink(verificationToken);
  
  // Enhanced production logging
  console.log('📧 ===== EMAIL VERIFICATION PROCESS START =====');
  console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Generated verification link: ${verificationLink}`);
  console.log(`📧 Sending verification email to: ${email}`);
  console.log(`👤 Recipient name: ${name}`);
  console.log(`🔑 Verification token: ${verificationToken}`);

  try {
    const emailClient = getTransactionalEmailApi();

    if (!emailClient) {
      return {
        success: false,
        error: 'Email service not configured. Please contact administrator.',
        missingConfig: true
      };
    }

    const sender = getSenderDetails();

    const emailPayload = {
      sender,
      to: [{ email, name }],
      subject: 'Verify Your Email Address',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Email Verification Required</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with our Waste Management System. Please verify your email address by clicking the button below:</p>
          <div style="margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #4CAF50; 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 4px;
                      font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3498db;">${verificationLink}</p>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `
    };

    const response = await emailClient.sendTransacEmail(emailPayload);

    console.log('✅ ===== EMAIL VERIFICATION SUCCESS =====');
    console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Email delivered to: ${email}`);
    console.log(`👤 Recipient name: ${name}`);
    console.log(`📨 Message ID: ${response['messageId'] || response.messageId}`);
    console.log(`🔗 Verification link sent: ${verificationLink}`);
    console.log(`📤 From: "${sender.name}" <${sender.email}>`);
    console.log(`⏰ Sent at: ${new Date().toISOString()}`);
    console.log('🎉 User should receive email and can click verification link');
    console.log('📧 ===== EMAIL VERIFICATION COMPLETE =====');

    return {
      success: true,
      messageId: response['messageId'] || response.messageId,
      recipient: email,
      verificationLink,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to send verification email to:', email);
    console.error('❌ Error details:', error.message);
    console.error('❌ Full error:', error);

    return { success: false, error: error.message, recipient: email };
  }
};

// Send approval email
const sendApprovalEmail = async (userEmail, firstName, lastName) => {
  try {
    const emailClient = getTransactionalEmailApi();

    if (!emailClient) {
      console.log('📧 Email service not configured - skipping approval email');
      return { success: true, skipped: true };
    }

    const sender = getSenderDetails();
    const template = getApprovalEmailTemplate(firstName, lastName);
    const response = await emailClient.sendTransacEmail({
      sender,
      to: [{ email: userEmail, name: `${firstName} ${lastName}`.trim() || 'User' }],
      subject: template.subject,
      htmlContent: template.html
    });

    console.log('Approval email sent successfully:', response['messageId'] || response.messageId);
    return { success: true, messageId: response['messageId'] || response.messageId };
  } catch (error) {
    console.error('Error sending approval email:', error);
    return { success: false, error: error.message };
  }
};

// Send rejection email
const sendRejectionEmail = async (userEmail, firstName, lastName, reason) => {
  try {
    const emailClient = getTransactionalEmailApi();

    if (!emailClient) {
      console.log('📧 Email service not configured - skipping rejection email');
      return { success: true, skipped: true };
    }

    const sender = getSenderDetails();
    const template = getRejectionEmailTemplate(firstName, lastName, reason);
    await emailClient.sendTransacEmail({
      sender,
      to: [{ email: userEmail, name: `${firstName} ${lastName}`.trim() || 'User' }],
      subject: template.subject,
      htmlContent: template.html
    });

    console.log('Rejection email sent successfully to:', userEmail);
    return { success: true };
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendApprovalEmail,
  sendRejectionEmail
};