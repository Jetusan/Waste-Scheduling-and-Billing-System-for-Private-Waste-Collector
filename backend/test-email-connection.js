// Test email connection
require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmailConnection = async () => {
  console.log('🧪 Testing email connection...');
  
  // Check if credentials are configured
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    console.log('❌ Brevo SMTP credentials not found in .env file');
    console.log('Required variables: BREVO_SMTP_USER, BREVO_SMTP_KEY, BREVO_SENDER_EMAIL');
    console.log('Current values:');
    console.log('BREVO_SMTP_USER:', process.env.BREVO_SMTP_USER || 'NOT SET');
    console.log('BREVO_SMTP_KEY:', process.env.BREVO_SMTP_KEY ? '***HIDDEN***' : 'NOT SET');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY
    }
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    console.log(`📧 Using: ${process.env.BREVO_SMTP_USER}`);
    console.log(`📤 Sender: ${process.env.BREVO_SENDER_EMAIL || process.env.BREVO_SMTP_USER}`);
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
  }
};

testEmailConnection();
