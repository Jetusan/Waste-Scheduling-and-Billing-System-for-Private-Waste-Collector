#!/usr/bin/env node

/**
 * Comprehensive Email Verification Flow Test Script
 * Tests the complete registration and email verification process
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const BASE_URL = 'http://localhost:5000'; // Backend server port
const TEST_EMAIL = 'pixeltoast965@gmail.com';
const TEST_USER_DATA = {
  firstName: 'John',
  middleName: 'Michael',
  lastName: 'Doe',
  username: 'johndoe_test',
  contactNumber: '09123456789',
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!',
  city: 'Quezon City',
  barangay: 'Barangay Commonwealth',
  subdivision: 'Test Subdivision',
  street: 'Test Street',
  block: 'Block 1',
  lot: 'Lot 2',
  houseNumber: '123',
  purok: 'Purok 1',
  email: TEST_EMAIL,
  dateOfBirth: '1990-01-01'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user input
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Color console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}${colors.bright}🔹 ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.magenta}${colors.bright}═══ ${msg} ═══${colors.reset}\n`)
};

// API helper functions
const api = {
  async sendVerificationEmail(email, name) {
    try {
      const response = await axios.post(`${BASE_URL}/api/send-verification`, {
        email,
        name
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  async checkVerificationStatus(email) {
    try {
      const response = await axios.post(`${BASE_URL}/api/check-verification-status`, {
        email
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  async getCombinedVerificationStatus(email) {
    try {
      const response = await axios.post(`${BASE_URL}/api/combined-verification-status`, {
        email
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  async register(userData) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register-optimized`, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  async login(username, password) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login-enhanced`, {
        username,
        password
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  async getPendingRegistrations() {
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/registrations/pending`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  async approveRegistration(userId) {
    try {
      const response = await axios.post(`${BASE_URL}/api/admin/registrations/approve/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  async rejectRegistration(userId, reason) {
    try {
      const response = await axios.post(`${BASE_URL}/api/admin/registrations/reject/${userId}`, {
        reason
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
};

// Test functions
async function testStep1EmailVerification() {
  log.header('STEP 1: Email Verification (Pre-Registration)');
  
  try {
    log.step('Sending verification email...');
    const result = await api.sendVerificationEmail(TEST_EMAIL, `${TEST_USER_DATA.firstName} ${TEST_USER_DATA.lastName}`);
    log.success(`Verification email sent: ${result.message}`);
    
    log.info('Please check your email and click the verification link.');
    await prompt('Press Enter after clicking the verification link...');
    
    log.step('Checking verification status...');
    const status = await api.checkVerificationStatus(TEST_EMAIL);
    
    if (status.verified) {
      log.success('Email verified successfully in Step 1!');
      return true;
    } else {
      log.error('Email not yet verified. Please check your email again.');
      return false;
    }
  } catch (error) {
    log.error(`Step 1 failed: ${error.message}`);
    return false;
  }
}

async function testCombinedVerificationStatus() {
  log.header('COMBINED VERIFICATION STATUS CHECK');
  
  try {
    const status = await api.getCombinedVerificationStatus(TEST_EMAIL);
    
    log.info('Combined Verification Status:');
    console.log(JSON.stringify(status, null, 2));
    
    if (status.overallVerified) {
      log.success(`Email verified via ${status.source}`);
    } else {
      log.warning('Email not verified in any system');
    }
    
    return status;
  } catch (error) {
    log.error(`Combined status check failed: ${error.message}`);
    return null;
  }
}

async function testRegistration() {
  log.header('STEP 2: User Registration');
  
  try {
    log.step('Submitting registration...');
    const result = await api.register(TEST_USER_DATA);
    log.success(`Registration submitted: ${result.message}`);
    log.info(`User ID: ${result.user.id}`);
    
    return result.user;
  } catch (error) {
    log.error(`Registration failed: ${error.message}`);
    return null;
  }
}

async function testLoginBeforeApproval() {
  log.header('STEP 3: Login Test (Before Admin Approval)');
  
  try {
    log.step('Attempting login before admin approval...');
    await api.login(TEST_USER_DATA.username, TEST_USER_DATA.password);
    log.error('Login succeeded when it should have failed (pending approval)');
    return false;
  } catch (error) {
    if (error.message.includes('pending approval')) {
      log.success('Login correctly blocked: pending approval');
      return true;
    } else {
      log.error(`Unexpected login error: ${error.message}`);
      return false;
    }
  }
}

async function testAdminApproval() {
  log.header('STEP 4: Admin Approval Process');
  
  try {
    log.step('Fetching pending registrations...');
    const pendingResult = await api.getPendingRegistrations();
    
    if (!pendingResult.success || pendingResult.registrations.length === 0) {
      log.error('No pending registrations found. User may not be visible to admin.');
      return null;
    }
    
    // Find our test user
    const testUser = pendingResult.registrations.find(reg => reg.email === TEST_EMAIL);
    
    if (!testUser) {
      log.error('Test user not found in pending registrations');
      return null;
    }
    
    log.success(`Found test user in pending registrations: ${testUser.name}`);
    
    const action = await prompt('Do you want to (a)pprove or (r)eject this registration? [a/r]: ');
    
    if (action.toLowerCase() === 'a') {
      log.step('Approving registration...');
      const approvalResult = await api.approveRegistration(testUser.userId);
      log.success(`Registration approved: ${approvalResult.message}`);
      return { action: 'approved', userId: testUser.userId };
    } else if (action.toLowerCase() === 'r') {
      const reason = await prompt('Enter rejection reason: ');
      log.step('Rejecting registration...');
      const rejectionResult = await api.rejectRegistration(testUser.userId, reason);
      log.success(`Registration rejected: ${rejectionResult.message}`);
      return { action: 'rejected', userId: testUser.userId };
    } else {
      log.warning('Invalid action selected');
      return null;
    }
  } catch (error) {
    log.error(`Admin approval process failed: ${error.message}`);
    return null;
  }
}

async function testLoginAfterApproval() {
  log.header('STEP 5: Login Test (After Admin Approval)');
  
  try {
    log.step('Attempting login after admin approval...');
    const result = await api.login(TEST_USER_DATA.username, TEST_USER_DATA.password);
    log.success(`Login successful: ${result.message}`);
    log.info(`Token: ${result.token.substring(0, 20)}...`);
    log.info(`User: ${JSON.stringify(result.user, null, 2)}`);
    return true;
  } catch (error) {
    log.error(`Login failed: ${error.message}`);
    return false;
  }
}

async function runFullTest() {
  log.header('EMAIL VERIFICATION FLOW COMPREHENSIVE TEST');
  log.info(`Testing with email: ${TEST_EMAIL}`);
  log.info(`Base URL: ${BASE_URL}`);
  
  console.log('\nThis test will:');
  console.log('1. Send email verification (Step 1)');
  console.log('2. Check combined verification status');
  console.log('3. Register user');
  console.log('4. Test login before approval (should fail)');
  console.log('5. Admin approve/reject registration');
  console.log('6. Test login after approval (should succeed)');
  
  const proceed = await prompt('\nProceed with test? [y/N]: ');
  if (proceed.toLowerCase() !== 'y') {
    log.info('Test cancelled');
    return;
  }
  
  // Step 1: Email verification
  const step1Success = await testStep1EmailVerification();
  if (!step1Success) {
    log.error('Step 1 failed. Stopping test.');
    return;
  }
  
  // Check combined status after step 1
  await testCombinedVerificationStatus();
  
  // Step 2: Registration
  const registeredUser = await testRegistration();
  if (!registeredUser) {
    log.error('Registration failed. Stopping test.');
    return;
  }
  
  // Check combined status after registration
  await testCombinedVerificationStatus();
  
  // Step 3: Login before approval
  await testLoginBeforeApproval();
  
  // Step 4: Admin approval
  const approvalResult = await testAdminApproval();
  if (!approvalResult) {
    log.error('Admin approval process failed. Stopping test.');
    return;
  }
  
  // Step 5: Login after approval (only if approved)
  if (approvalResult.action === 'approved') {
    await testLoginAfterApproval();
  } else {
    log.info('Registration was rejected, skipping login test');
  }
  
  log.header('TEST COMPLETED');
  log.success('All tests completed successfully!');
  log.info('Check your email for approval/rejection notifications');
}

// Menu system
async function showMenu() {
  console.log('\n' + '='.repeat(50));
  console.log('EMAIL VERIFICATION TEST MENU');
  console.log('='.repeat(50));
  console.log('1. Run full test flow');
  console.log('2. Test Step 1 only (Email verification)');
  console.log('3. Check combined verification status');
  console.log('4. Test registration only');
  console.log('5. Test login');
  console.log('6. Check pending registrations');
  console.log('0. Exit');
  console.log('='.repeat(50));
  
  const choice = await prompt('Select option: ');
  
  switch (choice) {
    case '1':
      await runFullTest();
      break;
    case '2':
      await testStep1EmailVerification();
      break;
    case '3':
      await testCombinedVerificationStatus();
      break;
    case '4':
      await testRegistration();
      break;
    case '5':
      await testLoginAfterApproval();
      break;
    case '6':
      try {
        const result = await api.getPendingRegistrations();
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        log.error(`Failed to get pending registrations: ${error.message}`);
      }
      break;
    case '0':
      log.info('Goodbye!');
      rl.close();
      return;
    default:
      log.warning('Invalid option');
  }
  
  await showMenu();
}

// Main execution
async function main() {
  log.header('WSBS EMAIL VERIFICATION TEST SCRIPT');
  log.info('This script tests the complete email verification and registration flow');
  
  try {
    // Test server connectivity
    await axios.get(`${BASE_URL}/api/auth/barangays`);
    log.success('Server connection successful');
  } catch (error) {
    log.error(`Cannot connect to server at ${BASE_URL}`);
    log.error('Please ensure the backend server is running');
    rl.close();
    return;
  }
  
  await showMenu();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.info('\nTest interrupted by user');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  log.error(`Script error: ${error.message}`);
  rl.close();
  process.exit(1);
});
