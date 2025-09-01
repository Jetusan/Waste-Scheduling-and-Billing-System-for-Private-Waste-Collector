// test-registration.js
const axios = require('axios');

// Configuration - Update these values for your environment
const API_BASE_URL = 'http://localhost:3000/api/auth'; // Change to your backend URL
const TEST_USER = {
  firstName: 'Test',
  middleName: 'Middle',
  lastName: 'User',
  username: `testuser_${Date.now()}`, // Unique username
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

async function testRegistration() {
  console.log('🧪 Starting registration test...\n');
  
  try {
    // Test 1: Successful Registration
    console.log('1. Testing successful registration...');
    const response = await axios.post(`${API_BASE_URL}/register-optimized`, TEST_USER);
    
    if (response.data.success) {
      console.log('✅ SUCCESS: Registration completed successfully!');
      console.log('📋 Response:', {
        userId: response.data.user.id,
        username: response.data.user.username,
        name: response.data.user.name
      });
    } else {
      console.log('❌ FAILED: Registration was not successful');
      console.log('📋 Response:', response.data);
      return false;
    }

    // Test 2: Duplicate username
    console.log('\n2. Testing duplicate username validation...');
    try {
      const duplicateResponse = await axios.post(`${API_BASE_URL}/register-optimized`, {
        ...TEST_USER,
        email: `duplicate${Date.now()}@example.com` // Different email
      });
      console.log('❌ FAILED: Should have rejected duplicate username');
      return false;
    } catch (error) {
      if (error.response && error.response.data.message.includes('already exists')) {
        console.log('✅ SUCCESS: Correctly rejected duplicate username');
      } else {
        console.log('❌ FAILED: Unexpected error:', error.response?.data || error.message);
        return false;
      }
    }

    // Test 3: Missing required fields
    console.log('\n3. Testing missing required fields validation...');
    try {
      const incompleteUser = { ...TEST_USER };
      delete incompleteUser.firstName;
      incompleteUser.username = `testuser2_${Date.now()}`;
      incompleteUser.email = `test2${Date.now()}@example.com`;
      
      const missingFieldResponse = await axios.post(`${API_BASE_URL}/register-optimized`, incompleteUser);
      console.log('❌ FAILED: Should have rejected incomplete data');
      return false;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ SUCCESS: Correctly rejected incomplete data');
      } else {
        console.log('❌ FAILED: Unexpected error:', error.response?.data || error.message);
        return false;
      }
    }

    // Test 4: Password mismatch
    console.log('\n4. Testing password mismatch validation...');
    try {
      const passwordMismatchUser = { 
        ...TEST_USER,
        username: `testuser3_${Date.now()}`,
        email: `test3${Date.now()}@example.com`,
        confirmPassword: 'DifferentPassword123!'
      };
      
      const passwordResponse = await axios.post(`${API_BASE_URL}/register-optimized`, passwordMismatchUser);
      console.log('❌ FAILED: Should have rejected password mismatch');
      return false;
    } catch (error) {
      if (error.response && error.response.data.message.includes('Passwords do not match')) {
        console.log('✅ SUCCESS: Correctly rejected password mismatch');
      } else {
        console.log('❌ FAILED: Unexpected error:', error.response?.data || error.message);
        return false;
      }
    }

    // Test 5: Underage validation
    console.log('\n5. Testing age validation (under 18)...');
    try {
      const underageUser = { 
        ...TEST_USER,
        username: `testuser4_${Date.now()}`,
        email: `test4${Date.now()}@example.com`,
        dateOfBirth: '2010-01-01' // 14 years old
      };
      
      const ageResponse = await axios.post(`${API_BASE_URL}/register-optimized`, underageUser);
      console.log('❌ FAILED: Should have rejected underage user');
      return false;
    } catch (error) {
      if (error.response && error.response.data.message.includes('18 years old')) {
        console.log('✅ SUCCESS: Correctly rejected underage user');
      } else {
        console.log('❌ FAILED: Unexpected error:', error.response?.data || error.message);
        return false;
      }
    }

    console.log('\n🎉 ALL TESTS PASSED! Registration functionality is working correctly.');
    return true;

  } catch (error) {
    console.log('❌ TEST FAILED: Unexpected error occurred');
    console.log('Error details:', error.response?.data || error.message);
    return false;
  }
}

// Run the test
testRegistration().then(success => {
  process.exit(success ? 0 : 1);
});