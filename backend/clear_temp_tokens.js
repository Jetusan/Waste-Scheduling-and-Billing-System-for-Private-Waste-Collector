#!/usr/bin/env node

/**
 * Clear temporary verification tokens
 */

console.log('🔍 Checking temporary verification tokens...');

if (global.tempVerificationTokens) {
  const emails = Object.keys(global.tempVerificationTokens);
  console.log(`📊 Found ${emails.length} temporary tokens:`);
  
  emails.forEach(email => {
    const token = global.tempVerificationTokens[email];
    console.log(`  - ${email}: ${token.verified ? '✅ Verified' : '❌ Not verified'} (expires: ${new Date(token.expires).toLocaleString()})`);
  });
  
  // Clear all tokens
  global.tempVerificationTokens = {};
  console.log('🧹 Cleared all temporary verification tokens');
} else {
  console.log('📭 No temporary verification tokens found');
}

console.log('✅ Done');
process.exit(0);
