#!/usr/bin/env node

/**
 * Admin Registration Approval/Rejection Email Test Script
 * Tests the email notifications sent when admin approves or rejects registrations
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const BASE_URL = 'http://localhost:5000'; // Backend server port

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
  },

  async getRegistrationStats() {
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/registrations/stats`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
};

async function displayPendingRegistrations() {
  log.header('PENDING REGISTRATIONS');
  
  try {
    const result = await api.getPendingRegistrations();
    
    if (!result.success || result.registrations.length === 0) {
      log.warning('No pending registrations found');
      return [];
    }
    
    log.info(`Found ${result.registrations.length} pending registration(s):`);
    
    result.registrations.forEach((reg, index) => {
      console.log(`\n${index + 1}. ${reg.name}`);
      console.log(`   Email: ${reg.email}`);
      console.log(`   Username: ${reg.username}`);
      console.log(`   Contact: ${reg.contactNumber}`);
      console.log(`   Address: ${reg.address}`);
      console.log(`   Created: ${new Date(reg.createdAt).toLocaleString()}`);
      console.log(`   Email Verified: ${reg.emailVerified ? '✅' : '❌'}`);
      console.log(`   User ID: ${reg.userId}`);
    });
    
    return result.registrations;
  } catch (error) {
    log.error(`Failed to get pending registrations: ${error.message}`);
    return [];
  }
}

async function approveRegistration(registrations) {
  if (registrations.length === 0) {
    log.warning('No registrations to approve');
    return;
  }
  
  const indexStr = await prompt(`\nEnter the number of registration to approve (1-${registrations.length}): `);
  const index = parseInt(indexStr) - 1;
  
  if (index < 0 || index >= registrations.length) {
    log.error('Invalid selection');
    return;
  }
  
  const registration = registrations[index];
  
  try {
    log.step(`Approving registration for ${registration.name}...`);
    const result = await api.approveRegistration(registration.userId);
    log.success(result.message);
    log.info(`✉️ Approval email sent to: ${registration.email}`);
    
    log.header('APPROVAL EMAIL CONTENT PREVIEW');
    console.log(`To: ${registration.email}`);
    console.log(`Subject: Registration Approved - Welcome to Waste Management System!`);
    console.log(`\nThe user will receive an email with:`);
    console.log(`• Welcome message`);
    console.log(`• Information about available services`);
    console.log(`• Instructions to log in`);
    console.log(`• Contact information for support`);
    
  } catch (error) {
    log.error(`Failed to approve registration: ${error.message}`);
  }
}

async function rejectRegistration(registrations) {
  if (registrations.length === 0) {
    log.warning('No registrations to reject');
    return;
  }
  
  const indexStr = await prompt(`\nEnter the number of registration to reject (1-${registrations.length}): `);
  const index = parseInt(indexStr) - 1;
  
  if (index < 0 || index >= registrations.length) {
    log.error('Invalid selection');
    return;
  }
  
  const registration = registrations[index];
  const reason = await prompt('Enter rejection reason (optional): ');
  
  try {
    log.step(`Rejecting registration for ${registration.name}...`);
    const result = await api.rejectRegistration(registration.userId, reason);
    log.success(result.message);
    log.info(`✉️ Rejection email sent to: ${registration.email}`);
    
    log.header('REJECTION EMAIL CONTENT PREVIEW');
    console.log(`To: ${registration.email}`);
    console.log(`Subject: Registration Update - Waste Management System`);
    console.log(`\nThe user will receive an email with:`);
    console.log(`• Notification about registration status`);
    console.log(`• Reason for rejection: ${reason || 'Not specified'}`);
    console.log(`• Instructions for next steps`);
    console.log(`• Contact information for support`);
    
  } catch (error) {
    log.error(`Failed to reject registration: ${error.message}`);
  }
}

async function showRegistrationStats() {
  log.header('REGISTRATION STATISTICS');
  
  try {
    const result = await api.getRegistrationStats();
    
    if (result.success) {
      console.log(`📊 Registration Statistics:`);
      console.log(`   Pending: ${result.stats.pending}`);
      console.log(`   Approved: ${result.stats.approved}`);
      console.log(`   Rejected: ${result.stats.rejected}`);
      console.log(`   Total: ${result.stats.total}`);
    } else {
      log.error('Failed to get registration statistics');
    }
  } catch (error) {
    log.error(`Failed to get registration stats: ${error.message}`);
  }
}

async function testEmailNotifications() {
  log.header('EMAIL NOTIFICATION TEST');
  
  log.info('This will test the actual email sending functionality');
  log.warning('Make sure you have valid email configuration in your .env file');
  
  const proceed = await prompt('Do you want to proceed with email notification test? [y/N]: ');
  if (proceed.toLowerCase() !== 'y') {
    log.info('Email test cancelled');
    return;
  }
  
  const registrations = await displayPendingRegistrations();
  
  if (registrations.length === 0) {
    log.info('No pending registrations to test with');
    log.info('You can create a test registration first using the main test script');
    return;
  }
  
  const action = await prompt('\nDo you want to (a)pprove or (r)eject a registration? [a/r]: ');
  
  if (action.toLowerCase() === 'a') {
    await approveRegistration(registrations);
  } else if (action.toLowerCase() === 'r') {
    await rejectRegistration(registrations);
  } else {
    log.warning('Invalid action selected');
  }
}

async function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('ADMIN REGISTRATION EMAIL NOTIFICATION TEST');
  console.log('='.repeat(60));
  console.log('1. View pending registrations');
  console.log('2. Test approval email notification');
  console.log('3. Test rejection email notification');
  console.log('4. View registration statistics');
  console.log('5. Run email notification test');
  console.log('0. Exit');
  console.log('='.repeat(60));
  
  const choice = await prompt('Select option: ');
  
  switch (choice) {
    case '1':
      await displayPendingRegistrations();
      break;
    case '2':
      const registrations2 = await displayPendingRegistrations();
      await approveRegistration(registrations2);
      break;
    case '3':
      const registrations3 = await displayPendingRegistrations();
      await rejectRegistration(registrations3);
      break;
    case '4':
      await showRegistrationStats();
      break;
    case '5':
      await testEmailNotifications();
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
  log.header('ADMIN EMAIL NOTIFICATION TEST SCRIPT');
  log.info('This script tests admin approval/rejection email notifications');
  
  try {
    // Test server connectivity
    await axios.get(`${BASE_URL}/api/admin/registrations/stats`);
    log.success('Server connection successful');
  } catch (error) {
    log.error(`Cannot connect to server at ${BASE_URL}`);
    log.error('Please ensure the backend server is running');
    rl.close();
    return;
  }
  
  log.info('📧 Email notifications are already implemented in the system:');
  log.info('   • Approval emails are sent when admin approves registration');
  log.info('   • Rejection emails are sent when admin rejects registration');
  log.info('   • Both emails include professional styling and clear messaging');
  
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
