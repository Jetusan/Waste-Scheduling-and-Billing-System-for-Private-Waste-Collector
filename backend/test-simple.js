// test-simple.js
const axios = require('axios');

console.log('🧪 Starting simple registration test...\n');

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api/auth'; // Change if your port is different
const TEST_DATA = {
  firstName: 'Test',
  middleName: 'Middle',
  lastName: 'User',
  username: `testuser_${Date.now()}`,
  contactNumber: '09123456789',
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!',
  city: 'General Santos City',
  barangay: 'Bula',
  subdivision: 'Test Subdivision',
  street: 'Test Street',
  block: 'Block 1',
  lot: 'Lot 1',
  houseNumber: '123',
  purok: 'Purok 1',
  email: `test${Date.now()}@example.com`,
  dateOfBirth: '1990-01-01'
};

async function testConnection() {
  console.log('1. Testing server connection...');
  
  try {
    // First, let's check if the server is running
    const healthCheck = await axios.get(API_BASE_URL.replace('/api/auth', ''));
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Cannot connect to server:', error.message);
    console.log('💡 Make sure your backend server is running on port 3000');
    return false;
  }
}

async function testEndpoint() {
  console.log('\n2. Testing if registration endpoint exists...');
  
  try {
    // Try to access the endpoint (might get 404 or 405 if it exists but wrong method)
    const response = await axios.options(`${API_BASE_URL}/register-optimized`);
    console.log('✅ Endpoint exists');
    return true;
  } catch (error) {
    if (error.response) {
      // Server responded with an error status (4xx, 5xx)
      console.log('✅ Endpoint exists but returned error:', error.response.status);
      return true;
    } else {
      console.log('❌ Endpoint not found or server not running');
      return false;
    }
  }
}

async function testRegistration() {
  console.log('\n3. Testing actual registration...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/register-optimized`, TEST_DATA, {
      timeout: 5000, // 5 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Registration successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.log('❌ Registration failed');
    
    if (error.response) {
      // The server responded with an error status
      console.log('Status:', error.response.status);
      console.log('Error message:', error.response.data?.message || 'No error message');
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response received
      console.log('No response received from server');
      console.log('Request was made to:', error.config?.url);
      console.log('Error:', error.message);
    } else {
      // Something else happened
      console.log('Error:', error.message);
    }
    
    return false;
  }
}

async function runTests() {
  console.log('🔧 Testing configuration:');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Test username:', TEST_DATA.username);
  console.log('Test email:', TEST_DATA.email);
  
  const isConnected = await testConnection();
  if (!isConnected) return false;
  
  const endpointExists = await testEndpoint();
  if (!endpointExists) return false;
  
  const registrationWorked = await testRegistration();
  return registrationWorked;
}

// Run the tests
runTests().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure your backend server is running: node server.js or npm start');
    console.log('2. Check if the port is correct (currently testing: 3000)');
    console.log('3. Verify the endpoint URL matches your routes');
    console.log('4. Check for CORS issues if testing from different origin');
  }
  process.exit(success ? 0 : 1);
});