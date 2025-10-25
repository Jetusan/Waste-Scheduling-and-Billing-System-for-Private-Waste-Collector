const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Test assignments endpoints
async function testAssignments() {
  console.log('🧪 Testing Assignments Endpoints...\n');
  
  try {
    // Test 1: Get collectors (no auth needed for testing)
    console.log('1. Testing GET /api/collectors');
    try {
      const collectorsResponse = await axios.get(`${API_BASE_URL}/collectors`);
      console.log('✅ Collectors found:', collectorsResponse.data.length);
      if (collectorsResponse.data.length > 0) {
        console.log('   Sample collector:', collectorsResponse.data[0]);
      }
    } catch (error) {
      console.log('❌ Collectors endpoint error:', error.response?.data || error.message);
    }
    
    // Test 2: Get barangays
    console.log('\n2. Testing GET /api/barangays');
    try {
      const barangaysResponse = await axios.get(`${API_BASE_URL}/barangays`);
      console.log('✅ Barangays found:', barangaysResponse.data.length);
      if (barangaysResponse.data.length > 0) {
        console.log('   Sample barangay:', barangaysResponse.data[0]);
      }
    } catch (error) {
      console.log('❌ Barangays endpoint error:', error.response?.data || error.message);
    }
    
    // Test 3: Get assignments (without auth - should fail)
    console.log('\n3. Testing GET /api/assignments (without auth)');
    try {
      const assignmentsResponse = await axios.get(`${API_BASE_URL}/assignments`);
      console.log('✅ Assignments response:', assignmentsResponse.data);
    } catch (error) {
      console.log('❌ Expected auth error:', error.response?.status, error.response?.data?.message);
    }
    
    // Test 4: Test assignment creation endpoint structure
    console.log('\n4. Testing POST /api/assignments/barangay (without auth)');
    try {
      const testData = {
        collector_id: 1,
        barangay_id: 1,
        subdivision: 'vsm-heights-phase1'
      };
      
      const createResponse = await axios.post(`${API_BASE_URL}/assignments/barangay`, testData);
      console.log('✅ Assignment created:', createResponse.data);
    } catch (error) {
      console.log('❌ Expected auth error:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testAssignments();
