#!/usr/bin/env node

/**
 * Delete User Data Script
 * Safely delete user data to allow re-registration with same email/username
 */

const path = require('path');
const pool = require(path.resolve(__dirname, '../config/dbAdmin'));
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

async function findUserByEmail(email) {
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.registration_status, u.approval_status,
        un.first_name, un.last_name, u.created_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows;
  } catch (error) {
    log.error(`Error finding user: ${error.message}`);
    return [];
  }
}

async function findUserByUsername(username) {
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.registration_status, u.approval_status,
        un.first_name, un.last_name, u.created_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows;
  } catch (error) {
    log.error(`Error finding user: ${error.message}`);
    return [];
  }
}

async function findUserById(userId) {
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.registration_status, u.approval_status,
        un.first_name, un.last_name, u.created_at, u.name_id, u.address_id
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    log.error(`Error finding user: ${error.message}`);
    return null;
  }
}

async function deleteUserCompletely(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get user details first
    const user = await findUserById(userId);
    if (!user) {
      log.error('User not found');
      return false;
    }
    
    log.info(`Deleting user: ${user.first_name} ${user.last_name} (${user.username}, ${user.email})`);
    
    // Delete related data in correct order (respecting foreign keys)
    
    // 1. Delete from users table first (this will cascade to most related tables)
    const deleteUserQuery = 'DELETE FROM users WHERE user_id = $1';
    await client.query(deleteUserQuery, [userId]);
    log.success('Deleted from users table');
    
    // 2. Delete from user_names table if exists
    if (user.name_id) {
      const deleteNameQuery = 'DELETE FROM user_names WHERE name_id = $1';
      await client.query(deleteNameQuery, [user.name_id]);
      log.success('Deleted from user_names table');
    }
    
    // 3. Delete from addresses table if exists
    if (user.address_id) {
      const deleteAddressQuery = 'DELETE FROM addresses WHERE address_id = $1';
      await client.query(deleteAddressQuery, [user.address_id]);
      log.success('Deleted from addresses table');
    }
    
    // 4. Clean up any other related tables (add more as needed)
    const cleanupTables = [
      'user_locations',
      'collection_actions',
      'special_pickup_requests',
      'customer_subscriptions',
      'invoices'
    ];
    
    for (const table of cleanupTables) {
      try {
        const cleanupQuery = `DELETE FROM ${table} WHERE user_id = $1`;
        const result = await client.query(cleanupQuery, [userId]);
        if (result.rowCount > 0) {
          log.success(`Deleted ${result.rowCount} records from ${table}`);
        }
      } catch (error) {
        // Table might not exist or have user_id column, that's okay
        log.debug(`Skipped ${table} (${error.message})`);
      }
    }
    
    await client.query('COMMIT');
    log.success('User data deleted successfully!');
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    log.error(`Error deleting user: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

async function searchAndDeleteByEmail() {
  log.header('DELETE USER BY EMAIL');
  
  const email = await prompt('Enter email address: ');
  if (!email.trim()) {
    log.error('Email is required');
    return;
  }
  
  const users = await findUserByEmail(email.trim());
  
  if (users.length === 0) {
    log.warning(`No users found with email: ${email}`);
    return;
  }
  
  log.info(`Found ${users.length} user(s) with email: ${email}`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.first_name} ${user.last_name} (ID: ${user.user_id})`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Status: ${user.registration_status}/${user.approval_status}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
  });
  
  const confirm = await prompt(`Are you sure you want to delete ALL users with email ${email}? [y/N]: `);
  if (confirm.toLowerCase() !== 'y') {
    log.info('Deletion cancelled');
    return;
  }
  
  for (const user of users) {
    log.info(`Deleting user ID: ${user.user_id}`);
    await deleteUserCompletely(user.user_id);
  }
}

async function searchAndDeleteByUsername() {
  log.header('DELETE USER BY USERNAME');
  
  const username = await prompt('Enter username: ');
  if (!username.trim()) {
    log.error('Username is required');
    return;
  }
  
  const users = await findUserByUsername(username.trim());
  
  if (users.length === 0) {
    log.warning(`No users found with username: ${username}`);
    return;
  }
  
  log.info(`Found ${users.length} user(s) with username: ${username}`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.first_name} ${user.last_name} (ID: ${user.user_id})`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Status: ${user.registration_status}/${user.approval_status}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
  });
  
  const confirm = await prompt(`Are you sure you want to delete ALL users with username ${username}? [y/N]: `);
  if (confirm.toLowerCase() !== 'y') {
    log.info('Deletion cancelled');
    return;
  }
  
  for (const user of users) {
    log.info(`Deleting user ID: ${user.user_id}`);
    await deleteUserCompletely(user.user_id);
  }
}

async function deleteByUserId() {
  log.header('DELETE USER BY ID');
  
  const userIdStr = await prompt('Enter user ID: ');
  const userId = parseInt(userIdStr);
  
  if (!userId || isNaN(userId)) {
    log.error('Valid user ID is required');
    return;
  }
  
  const user = await findUserById(userId);
  
  if (!user) {
    log.warning(`No user found with ID: ${userId}`);
    return;
  }
  
  log.info('Found user:');
  console.log(`   Name: ${user.first_name} ${user.last_name}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Status: ${user.registration_status}/${user.approval_status}`);
  console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
  console.log('');
  
  const confirm = await prompt(`Are you sure you want to delete user ID ${userId}? [y/N]: `);
  if (confirm.toLowerCase() !== 'y') {
    log.info('Deletion cancelled');
    return;
  }
  
  await deleteUserCompletely(userId);
}

async function listPendingUsers() {
  log.header('PENDING USERS');
  
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.registration_status, u.approval_status,
        un.first_name, un.last_name, u.created_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.registration_status = 'pending' OR u.approval_status = 'pending'
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      log.info('No pending users found');
      return;
    }
    
    log.info(`Found ${result.rows.length} pending users:`);
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name || 'Unknown'} ${user.last_name || 'User'} (ID: ${user.user_id})`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Status: ${user.registration_status}/${user.approval_status}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });
    
  } catch (error) {
    log.error(`Error listing pending users: ${error.message}`);
  }
}

async function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('USER DATA DELETION TOOL');
  console.log('='.repeat(60));
  console.log('1. Delete user by email');
  console.log('2. Delete user by username');
  console.log('3. Delete user by ID');
  console.log('4. List pending users');
  console.log('0. Exit');
  console.log('='.repeat(60));
  
  const choice = await prompt('Select option: ');
  
  switch (choice) {
    case '1':
      await searchAndDeleteByEmail();
      break;
    case '2':
      await searchAndDeleteByUsername();
      break;
    case '3':
      await deleteByUserId();
      break;
    case '4':
      await listPendingUsers();
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
  log.header('USER DATA DELETION TOOL');
  log.warning('⚠️ This tool will PERMANENTLY delete user data!');
  log.warning('⚠️ Use with caution - deleted data cannot be recovered!');
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    log.success('Database connected successfully');
  } catch (error) {
    log.error(`Cannot connect to database: ${error.message}`);
    rl.close();
    return;
  }
  
  await showMenu();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.info('\nOperation interrupted by user');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  log.error(`Script error: ${error.message}`);
  rl.close();
  process.exit(1);
});
