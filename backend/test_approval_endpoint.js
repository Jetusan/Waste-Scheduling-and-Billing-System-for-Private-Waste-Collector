#!/usr/bin/env node

/**
 * Test the approval endpoint directly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testApprovalEndpoint() {
  console.log('🔍 Testing admin approval endpoint...\n');
  
  try {
    // First, get pending registrations to find a user to approve
    console.log('1. Getting pending registrations...');
    const pendingResponse = await axios.get(`${BASE_URL}/api/admin/registrations/pending`);
    
    if (!pendingResponse.data.success || pendingResponse.data.registrations.length === 0) {
      console.log('❌ No pending registrations found to test with');
      return;
    }
    
    const firstUser = pendingResponse.data.registrations[0];
    console.log(`📋 Found pending user: ${firstUser.name} (ID: ${firstUser.userId}, Email: ${firstUser.email})`);
    
    // Test the approval endpoint
    console.log(`\n2. Testing approval for user ID: ${firstUser.userId}`);
    const approvalResponse = await axios.post(`${BASE_URL}/api/admin/registrations/approve/${firstUser.userId}`);
    
    console.log('✅ Approval request successful!');
    console.log('📊 Response:', JSON.stringify(approvalResponse.data, null, 2));
    
    // Check if the user status changed
    console.log('\n3. Checking if user status changed...');
    const updatedPendingResponse = await axios.get(`${BASE_URL}/api/admin/registrations/pending`);
    const stillPending = updatedPendingResponse.data.registrations.find(u => u.userId === firstUser.userId);
    
    if (stillPending) {
      console.log('⚠️ User is still in pending list - approval might not have worked');
    } else {
      console.log('✅ User is no longer in pending list - approval worked!');
    }
    
  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testSpecificUser() {
  const userId = process.argv[2];
  if (!userId) {
    console.log('Usage: node test_approval_endpoint.js [userId]');
    console.log('Or just run: node test_approval_endpoint.js (to test with first pending user)');
    return;
  }
  
  console.log(`🔍 Testing approval for specific user ID: ${userId}\n`);
  
  try {
    const approvalResponse = await axios.post(`${BASE_URL}/api/admin/registrations/approve/${userId}`);
    
    console.log('✅ Approval request successful!');
    console.log('📊 Response:', JSON.stringify(approvalResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

// Check if specific user ID was provided
if (process.argv[2]) {
  testSpecificUser();
} else {
  testApprovalEndpoint();
}
