// backend/services/mailer.js
const nodemailer = require('nodemailer');

// Create transporter only when credentials are available
const createTransporter = () => {
  // Check if Brevo credentials are configured
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    console.log('⚠️ Brevo SMTP credentials not configured in mailer.js - email service disabled');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });

  // Test the connection only if transporter is created
  transporter.verify((error) => {
    if (error) {
      console.error('❌ SMTP Connection Error:', error);
    } else {
      console.log('✅ SMTP Server is ready to take our messages');
    }
  });

  return transporter;
};

// Export a function that creates transporter when needed
module.exports = {
  getTransporter: createTransporter,
  // For backward compatibility, export null if no credentials
  transporter: process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY ? createTransporter() : null
};