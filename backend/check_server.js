#!/usr/bin/env node

/**
 * Simple Server Status Checker
 * Checks if the backend server is running and accessible
 */

const axios = require('axios');

// Configuration from your config.js
const PORTS_TO_CHECK = [5000, 3000, 3001, 8080];
const LOCAL_IP = '192.168.254.121';

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
  header: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

async function checkPort(host, port) {
  const url = `http://${host}:${port}`;
  try {
    // Try to access a simple endpoint
    const response = await axios.get(`${url}/api/auth/barangays`, { timeout: 3000 });
    return { success: true, status: response.status, url };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return { success: false, error: 'Connection refused (server not running)', url };
    } else if (error.code === 'ETIMEDOUT') {
      return { success: false, error: 'Connection timeout', url };
    } else if (error.response) {
      return { success: true, status: error.response.status, url, note: 'Server running but endpoint may not exist' };
    } else {
      return { success: false, error: error.message, url };
    }
  }
}

async function checkAllPorts() {
  log.header('BACKEND SERVER STATUS CHECK');
  
  log.info('Checking common ports for WSBS backend server...');
  
  const hosts = ['localhost', LOCAL_IP];
  let foundServer = false;
  
  for (const host of hosts) {
    console.log(`\n🔍 Checking ${host}:`);
    
    for (const port of PORTS_TO_CHECK) {
      const result = await checkPort(host, port);
      
      if (result.success) {
        log.success(`Server found at ${result.url} (Status: ${result.status})`);
        if (result.note) {
          log.warning(result.note);
        }
        foundServer = true;
      } else {
        log.error(`${result.url} - ${result.error}`);
      }
    }
  }
  
  if (!foundServer) {
    log.header('SERVER NOT FOUND');
    log.warning('No backend server found on any common port.');
    log.info('To start the backend server:');
    console.log('1. Open a new terminal');
    console.log('2. Navigate to the backend directory:');
    console.log('   cd c:\\Users\\jytti\\OneDrive\\Desktop\\WASTE\\backend');
    console.log('3. Start the server:');
    console.log('   npm start');
    console.log('   OR');
    console.log('   npm run dev');
    console.log('   OR');
    console.log('   node index.js');
    
    log.info('\nExpected output when server starts:');
    console.log('✅ Database connected successfully!');
    console.log('Server running on port 5000');
    console.log('API URL: http://192.168.254.121:5000');
    console.log('Local URL: http://localhost:5000');
    console.log('🎯 Server is now ready to handle requests!');
  } else {
    log.header('NEXT STEPS');
    log.success('Backend server is running! You can now run the test scripts:');
    console.log('npm run test-email-flow');
    console.log('npm run test-admin-emails');
  }
}

// Check if we can access the config
try {
  const config = require('./config/config');
  log.info(`Using configuration from config.js:`);
  console.log(`- Expected port: ${config.PORT}`);
  console.log(`- Local IP: ${config.LOCAL_IP}`);
  console.log(`- Base URL: ${config.BASE_URL}`);
  console.log(`- Localhost URL: ${config.LOCALHOST_URL}`);
} catch (error) {
  log.warning('Could not load config.js, using default values');
}

checkAllPorts().catch((error) => {
  log.error(`Script error: ${error.message}`);
  process.exit(1);
});
