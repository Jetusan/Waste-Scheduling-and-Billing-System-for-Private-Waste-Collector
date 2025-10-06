/**
 * Email Configuration Test Script
 * Run this to diagnose email verification issues
 */

require('dotenv').config();
const { sendVerificationEmail } = require('./services/emailService');
const { logConfiguration } = require('./config/urlConfig');

async function testEmailConfig() {
  console.log('🔍 WSBS Email Configuration Test');
  console.log('='.repeat(50));
  
  // Check environment variables
  console.log('\n📋 Environment Variables Check:');
  console.log(`BREVO_SMTP_USER: ${process.env.BREVO_SMTP_USER ? '✅ SET' : '❌ MISSING'}`);
  console.log(`BREVO_SMTP_KEY: ${process.env.BREVO_SMTP_KEY ? '✅ SET' : '❌ MISSING'}`);
  console.log(`BREVO_SENDER_EMAIL: ${process.env.BREVO_SENDER_EMAIL ? '✅ SET' : '❌ MISSING'}`);
  console.log(`PUBLIC_URL: ${process.env.PUBLIC_URL || 'http://localhost:5000 (default)'}`);
  
  // Show URL configuration
  console.log('\n🔧 URL Configuration:');
  logConfiguration();
  
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY || !process.env.BREVO_SENDER_EMAIL) {
    console.log('\n❌ CRITICAL: Missing required SMTP environment variables!');
    console.log('\nRequired variables for Brevo SMTP:');
    console.log('BREVO_SMTP_USER=956d39001@smtp-brevo.com');
    console.log('BREVO_SMTP_KEY=rDkyQGwCxUvONgMF');
    console.log('BREVO_SENDER_EMAIL=2022_cete_delapenaj@online.htcgsc.edu.ph');
    console.log('\nAdd these to your .env file or environment variables.');
    return;
  }
  
  // Test email sending
  console.log('\n📧 Testing Email Sending...');
  const testEmail = 'jetusan0o0@gmail.com'; // Change this to your email for testing
  const testName = 'Test User';
  const testToken = 'test-token-123';
  
  console.log(`Sending test verification email to: ${testEmail}`);
  
  try {
    const result = await sendVerificationEmail(testEmail, testName, testToken);
    
    if (result.success) {
      console.log('✅ Email test PASSED!');
      console.log(`📧 Email sent to: ${result.recipient}`);
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log('\n🎉 Email configuration is working correctly!');
    } else {
      console.log('❌ Email test FAILED!');
      console.log(`Error: ${result.error}`);
      
      if (result.missingConfig) {
        console.log('\n💡 Solution: Configure SMTP environment variables');
      } else {
        console.log('\n💡 Check SMTP credentials and network connectivity');
      }
    }
  } catch (error) {
    console.error('❌ Email test ERROR:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testEmailConfig().catch(console.error);
}

module.exports = { testEmailConfig };
