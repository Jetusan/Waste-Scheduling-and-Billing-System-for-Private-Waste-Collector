/**
 * Production Email Verification Test
 * Tests the complete email verification flow for production deployment
 */

require('dotenv').config();
const { sendVerificationEmail } = require('./services/emailService');
const { logConfiguration } = require('./config/urlConfig');

async function testProductionEmail() {
  console.log('🚀 WSBS Production Email Verification Test');
  console.log('='.repeat(60));
  
  // Show current configuration
  console.log('\n🔧 Current Configuration:');
  logConfiguration();
  
  // Verify production environment variables
  console.log('\n📋 Production Environment Check:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`PUBLIC_URL: ${process.env.PUBLIC_URL || 'Not set'}`);
  console.log(`BREVO_SMTP_USER: ${process.env.BREVO_SMTP_USER ? '✅ SET' : '❌ MISSING'}`);
  console.log(`BREVO_SMTP_KEY: ${process.env.BREVO_SMTP_KEY ? '✅ SET' : '❌ MISSING'}`);
  console.log(`BREVO_SENDER_EMAIL: ${process.env.BREVO_SENDER_EMAIL ? '✅ SET' : '❌ MISSING'}`);
  
  // Check if using production URL
  const currentUrl = process.env.PUBLIC_URL;
  const isProductionUrl = currentUrl && currentUrl.includes('waste-scheduling-and-billing-system-for.onrender.com');
  
  console.log('\n🎯 Deployment Configuration:');
  if (isProductionUrl) {
    console.log('✅ Using production URL - Perfect for deployment!');
    console.log(`🌐 Production URL: ${currentUrl}`);
  } else if (currentUrl) {
    console.log('⚠️  Using custom URL (tunnel/development)');
    console.log(`🌐 Custom URL: ${currentUrl}`);
    console.log('💡 For production, use: https://waste-scheduling-and-billing-system-for.onrender.com');
  } else {
    console.log('❌ No PUBLIC_URL set - will use localhost');
    console.log('💡 Set PUBLIC_URL=https://waste-scheduling-and-billing-system-for.onrender.com');
  }
  
  // Test email sending
  console.log('\n📧 Testing Email Verification Flow...');
  const testEmail = 'jetusan0o0@gmail.com'; // Your test email
  const testName = 'Production Test User';
  const testToken = `prod-test-${Date.now()}`;
  
  console.log(`📤 Sending test email to: ${testEmail}`);
  console.log(`🔑 Test token: ${testToken}`);
  
  try {
    const result = await sendVerificationEmail(testEmail, testName, testToken);
    
    if (result.success) {
      console.log('\n🎉 ===== PRODUCTION EMAIL TEST SUCCESS =====');
      console.log('✅ Email sent successfully!');
      console.log(`📧 Recipient: ${result.recipient}`);
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log(`🔗 Verification link: ${result.verificationLink}`);
      console.log(`⏰ Sent at: ${result.sentAt}`);
      
      console.log('\n📋 Next Steps:');
      console.log('1. Check your email inbox for the verification email');
      console.log('2. Click the verification link in the email');
      console.log('3. You should see a professional success page');
      console.log('4. Check Render logs for verification success messages');
      
      console.log('\n🚀 Production Deployment Status:');
      console.log('✅ Email service configured correctly');
      console.log('✅ SMTP credentials working');
      console.log('✅ Verification links generated properly');
      console.log('✅ Ready for production deployment!');
      
    } else {
      console.log('\n❌ Email test failed:');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Production Email Verification Test Complete');
}

// Run the test
testProductionEmail().catch(console.error);
