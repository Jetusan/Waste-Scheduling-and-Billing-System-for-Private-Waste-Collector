const { sendPasswordResetEmail } = require('../services/emailService');
require('dotenv').config();

async function testEmail() {
  try {
    console.log('🧪 Testing email delivery...');
    console.log('📧 BREVO_API_KEY configured:', !!process.env.BREVO_API_KEY);
    console.log('📧 BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL);
    
    // Test sending email
    const testEmail = 'jetusan0o0@gmail.com'; // Your email
    const testName = 'Test User';
    const testToken = 'test-token-123';
    
    console.log(`📤 Sending test email to: ${testEmail}`);
    
    const result = await sendPasswordResetEmail(testEmail, testName, testToken);
    
    console.log('✅ Test email sent successfully!');
    console.log('📋 Result:', result);
    
    console.log('\n📝 Email Troubleshooting Tips:');
    console.log('1. Check your spam/junk folder');
    console.log('2. Check promotions tab (Gmail)');
    console.log('3. Add noreply@wsbs.com to your contacts');
    console.log('4. Check if your email provider blocks automated emails');
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
