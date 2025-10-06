#!/usr/bin/env node

/**
 * WSBS Tunnel Setup Helper
 * Helps you quickly set up alternatives to ngrok
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌐 WSBS Tunnel Setup Helper');
console.log('='.repeat(50));

// Check if .env file exists
const envPath = path.join(__dirname, 'backend', '.env');
const envExists = fs.existsSync(envPath);

console.log('\n📋 Available Tunnel Services:');
console.log('1. Localtunnel (Easiest - No installation needed)');
console.log('2. Cloudflare Tunnel (Most reliable)');
console.log('3. Serveo (SSH-based)');
console.log('4. Manual setup instructions');
console.log('5. Exit');

// Simple CLI interface
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nChoose an option (1-5): ', (answer) => {
  switch(answer.trim()) {
    case '1':
      setupLocaltunnel();
      break;
    case '2':
      setupCloudflare();
      break;
    case '3':
      setupServeo();
      break;
    case '4':
      showManualInstructions();
      break;
    case '5':
      console.log('👋 Goodbye!');
      rl.close();
      break;
    default:
      console.log('❌ Invalid option. Please choose 1-5.');
      rl.close();
  }
});

function setupLocaltunnel() {
  console.log('\n🚀 Setting up Localtunnel...');
  
  try {
    // Check if localtunnel is installed
    try {
      execSync('lt --version', { stdio: 'ignore' });
      console.log('✅ Localtunnel already installed');
    } catch {
      console.log('📦 Installing Localtunnel...');
      execSync('npm install -g localtunnel', { stdio: 'inherit' });
      console.log('✅ Localtunnel installed successfully');
    }
    
    console.log('\n📝 Setup Instructions:');
    console.log('1. Start your backend server:');
    console.log('   cd backend && npm start');
    console.log('');
    console.log('2. In another terminal, run:');
    console.log('   lt --port 5000 --subdomain wsbs-dev');
    console.log('');
    console.log('3. Copy the URL (e.g., https://wsbs-dev.loca.lt)');
    console.log('4. Add to your .env file:');
    console.log('   PUBLIC_URL=https://wsbs-dev.loca.lt');
    console.log('');
    console.log('🎉 That\'s it! Your server will be accessible publicly.');
    
  } catch (error) {
    console.error('❌ Error setting up Localtunnel:', error.message);
  }
  
  rl.close();
}

function setupCloudflare() {
  console.log('\n☁️ Setting up Cloudflare Tunnel...');
  
  console.log('📝 Setup Instructions:');
  console.log('1. Download cloudflared:');
  console.log('   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
  console.log('');
  console.log('2. Start your backend server:');
  console.log('   cd backend && npm start');
  console.log('');
  console.log('3. In another terminal, run:');
  console.log('   cloudflared tunnel --url http://localhost:5000');
  console.log('');
  console.log('4. Copy the provided URL (e.g., https://abc-def-ghi.trycloudflare.com)');
  console.log('5. Add to your .env file:');
  console.log('   PUBLIC_URL=https://abc-def-ghi.trycloudflare.com');
  console.log('');
  console.log('🎉 Cloudflare Tunnel provides the most reliable connection!');
  
  rl.close();
}

function setupServeo() {
  console.log('\n🔐 Setting up Serveo (SSH-based)...');
  
  console.log('📝 Setup Instructions:');
  console.log('1. Start your backend server:');
  console.log('   cd backend && npm start');
  console.log('');
  console.log('2. In another terminal, run:');
  console.log('   ssh -R wsbs-dev:80:localhost:5000 serveo.net');
  console.log('');
  console.log('3. Look for the URL in the output (e.g., https://wsbs-dev.serveo.net)');
  console.log('4. Add to your .env file:');
  console.log('   PUBLIC_URL=https://wsbs-dev.serveo.net');
  console.log('');
  console.log('💡 Note: Requires SSH client (built into Windows 10+, macOS, Linux)');
  
  rl.close();
}

function showManualInstructions() {
  console.log('\n📖 Manual Setup Instructions:');
  console.log('');
  console.log('🔧 For any tunnel service:');
  console.log('1. Start your tunnel service of choice');
  console.log('2. Copy the public URL it provides');
  console.log('3. Add to your .env file:');
  console.log('   PUBLIC_URL=https://your-tunnel-url.com');
  console.log('4. Restart your backend server');
  console.log('5. Test with: node test_email_config.js');
  console.log('');
  console.log('📋 Supported environment variables:');
  console.log('- PUBLIC_URL (highest priority)');
  console.log('- LOCALTUNNEL_URL');
  console.log('- CLOUDFLARE_URL');
  console.log('- SERVEO_URL');
  console.log('- NGROK_URL');
  console.log('- BORE_URL');
  console.log('- PINGGY_URL');
  console.log('');
  console.log('📚 Full documentation: NGROK_ALTERNATIVES.md');
  
  rl.close();
}

// Handle process exit
rl.on('close', () => {
  process.exit(0);
});
