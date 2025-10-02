#!/usr/bin/env node

/**
 * Debug Email Verification Script
 * Helps debug the email verification flow step by step
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'pixeltoast965@gmail.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

async function debugStep1() {
  log.header('DEBUG: Step 1 Email Verification');
  
  try {
    // Step 1: Send verification email
    log.debug('Sending POST request to /api/send-verification');
    const response = await axios.post(`${BASE_URL}/api/send-verification`, {
      email: TEST_EMAIL,
      name: 'John Doe'
    });
    
    log.success('Email sent successfully!');
    log.debug('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Step 2: Check what's in temporary storage
    log.debug('Checking temporary verification tokens...');
    try {
      const statusResponse = await axios.post(`${BASE_URL}/api/check-verification-status`, {
        email: TEST_EMAIL
      });
      log.debug('Verification status response:');
      console.log(JSON.stringify(statusResponse.data, null, 2));
    } catch (statusError) {
      log.error('Status check failed:', statusError.response?.data || statusError.message);
    }
    
    // Step 3: Check combined status
    log.debug('Checking combined verification status...');
    try {
      const combinedResponse = await axios.post(`${BASE_URL}/api/combined-verification-status`, {
        email: TEST_EMAIL
      });
      log.debug('Combined status response:');
      console.log(JSON.stringify(combinedResponse.data, null, 2));
    } catch (combinedError) {
      log.error('Combined status check failed:', combinedError.response?.data || combinedError.message);
    }
    
    log.info('Now check your email for the verification link.');
    log.warning('IMPORTANT: The verification link should look like:');
    log.info(`${BASE_URL}/api/verify-email?token=SOME_LONG_TOKEN`);
    
    const emailReceived = await prompt('Did you receive the email? [y/n]: ');
    if (emailReceived.toLowerCase() !== 'y') {
      log.error('Email not received. Check your email configuration.');
      return;
    }
    
    const linkClicked = await prompt('Did you click the verification link? [y/n]: ');
    if (linkClicked.toLowerCase() === 'y') {
      const linkResult = await prompt('What did the verification page show? (copy the message): ');
      log.info(`Verification page result: ${linkResult}`);
      
      // Check status after clicking
      log.debug('Checking status after clicking link...');
      try {
        const afterClickStatus = await axios.post(`${BASE_URL}/api/check-verification-status`, {
          email: TEST_EMAIL
        });
        log.debug('Status after clicking:');
        console.log(JSON.stringify(afterClickStatus.data, null, 2));
      } catch (afterError) {
        log.error('After-click status check failed:', afterError.response?.data || afterError.message);
      }
      
      try {
        const afterClickCombined = await axios.post(`${BASE_URL}/api/combined-verification-status`, {
          email: TEST_EMAIL
        });
        log.debug('Combined status after clicking:');
        console.log(JSON.stringify(afterClickCombined.data, null, 2));
      } catch (afterCombinedError) {
        log.error('After-click combined status failed:', afterCombinedError.response?.data || afterCombinedError.message);
      }
    }
    
  } catch (error) {
    log.error(`Debug failed: ${error.message}`);
    if (error.response) {
      log.debug('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testDirectTokenVerification() {
  log.header('DEBUG: Direct Token Verification Test');
  
  try {
    // First, let's see what tokens are in memory
    log.debug('Checking current temporary tokens...');
    const statusResponse = await axios.post(`${BASE_URL}/api/check-verification-status`, {
      email: TEST_EMAIL
    });
    
    log.debug('Current status:', JSON.stringify(statusResponse.data, null, 2));
    
    // If there's a token, let's try to verify it manually
    const token = await prompt('Enter the verification token from the email URL (the part after token=): ');
    
    if (token.trim()) {
      log.debug(`Testing token verification with token: ${token.substring(0, 10)}...`);
      
      try {
        const verifyResponse = await axios.get(`${BASE_URL}/api/verify-email?token=${token.trim()}`);
        log.success('Token verification successful!');
        log.debug('Response:', verifyResponse.data);
      } catch (verifyError) {
        log.error('Token verification failed!');
        if (verifyError.response) {
          log.debug('Error response:', verifyError.response.data);
        }
      }
    }
    
  } catch (error) {
    log.error(`Direct token test failed: ${error.message}`);
  }
}

async function checkServerEndpoints() {
  log.header('DEBUG: Server Endpoints Check');
  
  const endpoints = [
    '/api/send-verification',
    '/api/check-verification-status', 
    '/api/combined-verification-status',
    '/api/verify-email'
  ];
  
  for (const endpoint of endpoints) {
    try {
      if (endpoint === '/api/verify-email') {
        // GET endpoint
        const response = await axios.get(`${BASE_URL}${endpoint}?token=test`, { timeout: 3000 });
        log.success(`${endpoint} - Accessible (Status: ${response.status})`);
      } else {
        // POST endpoint
        const response = await axios.post(`${BASE_URL}${endpoint}`, { email: 'test@test.com' }, { timeout: 3000 });
        log.success(`${endpoint} - Accessible (Status: ${response.status})`);
      }
    } catch (error) {
      if (error.response) {
        log.warning(`${endpoint} - Accessible but returned error (Status: ${error.response.status})`);
      } else {
        log.error(`${endpoint} - Not accessible (${error.message})`);
      }
    }
  }
}

async function showMenu() {
  console.log('\n' + '='.repeat(50));
  console.log('EMAIL VERIFICATION DEBUG MENU');
  console.log('='.repeat(50));
  console.log('1. Debug Step 1 (Send email + check status)');
  console.log('2. Test direct token verification');
  console.log('3. Check server endpoints');
  console.log('4. Clear temporary tokens');
  console.log('0. Exit');
  console.log('='.repeat(50));
  
  const choice = await prompt('Select option: ');
  
  switch (choice) {
    case '1':
      await debugStep1();
      break;
    case '2':
      await testDirectTokenVerification();
      break;
    case '3':
      await checkServerEndpoints();
      break;
    case '4':
      log.info('To clear temporary tokens, restart the backend server');
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

async function main() {
  log.header('EMAIL VERIFICATION DEBUG SCRIPT');
  log.info(`Testing with email: ${TEST_EMAIL}`);
  log.info(`Base URL: ${BASE_URL}`);
  
  try {
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

process.on('SIGINT', () => {
  log.info('\nDebug interrupted by user');
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  log.error(`Script error: ${error.message}`);
  rl.close();
  process.exit(1);
});
