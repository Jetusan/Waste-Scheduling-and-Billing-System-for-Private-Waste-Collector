#!/usr/bin/env node

/**
 * Simple test for admin pending registrations endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAdminEndpoint() {
  console.log('🔍 Testing admin pending registrations endpoint...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/registrations/pending`);
    
    console.log('✅ Request successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.registrations) {
      console.log(`\n📋 Found ${response.data.registrations.length} pending registrations:`);
      response.data.registrations.forEach((reg, index) => {
        console.log(`${index + 1}. ${reg.name} (${reg.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Request failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n🔍 Checking if the route is properly mounted...');
      
      // Test if the base admin route exists
      try {
        await axios.get(`${BASE_URL}/api/admin`);
        console.log('✅ /api/admin route exists');
      } catch (adminError) {
        console.log('❌ /api/admin route not found');
      }
    }
  }
}

testAdminEndpoint();
