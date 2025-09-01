#!/usr/bin/env node

/**
 * Script to update ngrok URL in config.js
 * Usage: node update-ngrok.js <new-ngrok-url>
 * Example: node update-ngrok.js https://abc123.ngrok-free.app
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config', 'config.js');

if (process.argv.length < 3) {
  console.log('❌ Usage: node update-ngrok.js <new-ngrok-url>');
  console.log('📝 Example: node update-ngrok.js https://abc123.ngrok-free.app');
  process.exit(1);
}

const newNgrokUrl = process.argv[2];

// Validate URL format
if (!newNgrokUrl.startsWith('https://') || !newNgrokUrl.includes('.ngrok-free.app')) {
  console.log('❌ Invalid ngrok URL format. Expected: https://xxxxx.ngrok-free.app');
  process.exit(1);
}

try {
  // Read current config
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Replace the ngrok URL
  const oldUrlRegex = /const NGROK_URL = process\.env\.NGROK_URL \|\| '[^']+';/;
  const newUrlLine = `const NGROK_URL = process.env.NGROK_URL || '${newNgrokUrl}';`;
  
  if (!oldUrlRegex.test(configContent)) {
    console.log('❌ Could not find NGROK_URL line in config.js');
    process.exit(1);
  }
  
  configContent = configContent.replace(oldUrlRegex, newUrlLine);
  
  // Write back to file
  fs.writeFileSync(configPath, configContent, 'utf8');
  
  console.log('✅ Successfully updated ngrok URL in config.js');
  console.log(`🔗 New URL: ${newNgrokUrl}`);
  console.log('🔄 Please restart your backend server for changes to take effect');
  
} catch (error) {
  console.error('❌ Error updating config:', error.message);
  process.exit(1);
}
