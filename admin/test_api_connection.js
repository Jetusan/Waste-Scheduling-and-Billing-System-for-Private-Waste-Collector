// Test API Connection for Admin Frontend
const axios = require('axios');

// API Configuration (same as admin frontend)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://waste-scheduling-and-billing-system-for.onrender.com';

async function testApiConnection() {
  console.log('🔍 Testing Admin Frontend API Connection...');
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Health Check
    console.log('\n🏥 Testing Health Check...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 10000 });
      console.log('✅ Health Check: Server is running');
      console.log(`📊 Response: ${JSON.stringify(healthResponse.data)}`);
    } catch (healthError) {
      console.log('⚠️  Health Check: Endpoint not available (this is okay)');
    }
    
    // Test 2: Subscription Plans
    console.log('\n📋 Testing Subscription Plans API...');
    const plansResponse = await axios.get(`${API_BASE_URL}/api/billing/subscription-plans`, { timeout: 15000 });
    console.log('✅ Subscription Plans: Success');
    console.log(`📊 Found ${plansResponse.data.length} plans:`, plansResponse.data);
    
    // Test 3: Invoices
    console.log('\n💰 Testing Invoices API...');
    const invoicesResponse = await axios.get(`${API_BASE_URL}/api/billing/invoices`, { timeout: 15000 });
    console.log('✅ Invoices: Success');
    console.log(`📊 Found ${invoicesResponse.data.length} invoices`);
    
    if (invoicesResponse.data.length > 0) {
      console.log('📄 Sample invoice:', {
        id: invoicesResponse.data[0].id,
        subscriber: invoicesResponse.data[0].subscriber,
        plan: invoicesResponse.data[0].plan,
        amount: invoicesResponse.data[0].amount,
        status: invoicesResponse.data[0].status
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL API TESTS PASSED!');
    console.log('✅ Your admin frontend should be able to connect to the backend');
    console.log('✅ Your billing data should display properly');
    
  } catch (error) {
    console.error('\n❌ API Connection Error:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check if backend server is running');
    console.error('2. Verify API_BASE_URL in admin/.env file');
    console.error('3. Check network connectivity');
    console.error('4. Verify backend routes are properly configured');
  }
}

// Run the test
testApiConnection().catch(console.error);
