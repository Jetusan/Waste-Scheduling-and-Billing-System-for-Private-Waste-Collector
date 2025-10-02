#!/usr/bin/env node

/**
 * Simple User Deletion Script
 * Focuses on core tables only
 */

const pool = require('./config/dbAdmin');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

async function deleteUserSimple(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get user details first
    const userQuery = `
      SELECT u.user_id, u.username, u.email, u.name_id, u.address_id,
             un.first_name, un.last_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1
    `;
    const userResult = await client.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return false;
    }
    
    const user = userResult.rows[0];
    console.log(`🗑️ Deleting user: ${user.first_name} ${user.last_name} (${user.username})`);
    
    // Delete in simple order
    
    // 1. Delete user record (this should cascade to most related tables)
    console.log('🔄 Deleting user record...');
    await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
    console.log('✅ User record deleted');
    
    // 2. Delete name record if exists
    if (user.name_id) {
      console.log('🔄 Deleting name record...');
      await client.query('DELETE FROM user_names WHERE name_id = $1', [user.name_id]);
      console.log('✅ Name record deleted');
    }
    
    // 3. Delete address record if exists
    if (user.address_id) {
      console.log('🔄 Deleting address record...');
      await client.query('DELETE FROM addresses WHERE address_id = $1', [user.address_id]);
      console.log('✅ Address record deleted');
    }
    
    await client.query('COMMIT');
    console.log('✅ User deleted successfully!');
    
    // Clear temp tokens
    if (user.email && global.tempVerificationTokens) {
      delete global.tempVerificationTokens[user.email];
      console.log(`✅ Cleared temp tokens for: ${user.email}`);
    }
    
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🗑️ SIMPLE USER DELETION TOOL\n');
  
  const userId = await prompt('Enter user ID to delete: ');
  if (!userId || isNaN(parseInt(userId))) {
    console.log('❌ Invalid user ID');
    rl.close();
    return;
  }
  
  const confirm = await prompt(`Are you sure you want to delete user ID ${userId}? [y/N]: `);
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Deletion cancelled');
    rl.close();
    return;
  }
  
  const success = await deleteUserSimple(parseInt(userId));
  
  if (success) {
    console.log('\n✅ Deletion completed successfully!');
  } else {
    console.log('\n❌ Deletion failed!');
  }
  
  rl.close();
}

main().catch(error => {
  console.error('Script error:', error);
  rl.close();
});
