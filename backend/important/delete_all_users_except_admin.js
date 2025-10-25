#!/usr/bin/env node

/**
 * Delete All Users Except Admin Script
 * Safely delete all user data except for admin user (user_id = 64)
 * ⚠️ WARNING: This will permanently delete all user data except the admin!
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.magenta}═══ ${msg} ═══${colors.reset}\n`),
  danger: (msg) => console.log(`${colors.red}🚨 ${msg}${colors.reset}`)
};

const ADMIN_USER_ID = 64;

async function getAdminUserInfo() {
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.registration_status, u.approval_status,
        un.first_name, un.last_name, u.created_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1
    `;
    const result = await pool.query(query, [ADMIN_USER_ID]);
    return result.rows[0] || null;
  } catch (error) {
    log.error(`Error finding admin user: ${error.message}`);
    return null;
  }
}

async function getAllNonAdminUsers() {
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.registration_status, u.approval_status,
        un.first_name, un.last_name, u.created_at, u.name_id, u.address_id
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id != $1
      ORDER BY u.user_id
    `;
    const result = await pool.query(query, [ADMIN_USER_ID]);
    return result.rows;
  } catch (error) {
    log.error(`Error getting users: ${error.message}`);
    return [];
  }
}

async function deleteAllNonAdminUsers() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    log.info('Starting bulk deletion of all non-admin users...');
    
    // Get all non-admin users first
    const users = await getAllNonAdminUsers();
    
    if (users.length === 0) {
      log.info('No non-admin users found to delete');
      await client.query('ROLLBACK');
      return true;
    }
    
    log.info(`Found ${users.length} non-admin users to delete`);
    
    // Get all user IDs to delete
    const userIds = users.map(user => user.user_id);
    const nameIds = users.filter(user => user.name_id).map(user => user.name_id);
    const addressIds = users.filter(user => user.address_id).map(user => user.address_id);
    
    // Delete from related tables first (in order of dependencies)
    // Complex dependency chain: receipts -> invoices -> customer_subscriptions
    const relatedTables = [
      'receipts',                    // Delete receipts first (references invoices and users)
      'collection_stop_events',
      'special_pickup_requests',
      'user_locations',
      'collection_actions',
      'notifications',
      'payment_sources',
      'collector_assignments',
      'user_sessions'
    ];
    
    // Handle invoices and subscriptions separately due to complex relationships
    const complexTables = [
      'invoices',                   // Delete invoices first (references customer_subscriptions)
      'customer_subscriptions'      // Delete subscriptions after invoices
    ];
    
    let totalDeleted = 0;
    
    for (const table of relatedTables) {
      try {
        const deleteQuery = `DELETE FROM ${table} WHERE user_id = ANY($1::int[])`;
        const result = await client.query(deleteQuery, [userIds]);
        if (result.rowCount > 0) {
          log.success(`Deleted ${result.rowCount} records from ${table}`);
          totalDeleted += result.rowCount;
        }
      } catch (error) {
        // Table might not exist or have user_id column, that's okay
        log.debug(`Skipped ${table} (${error.message})`);
      }
    }
    
    // Handle complex tables with specific logic
    for (const table of complexTables) {
      try {
        let deleteQuery;
        let params;
        
        if (table === 'invoices') {
          // Delete invoices for non-admin users
          deleteQuery = `DELETE FROM ${table} WHERE resident_id = ANY($1::int[])`;
          params = [userIds];
        } else if (table === 'customer_subscriptions') {
          // Delete subscriptions for non-admin users
          deleteQuery = `DELETE FROM ${table} WHERE user_id = ANY($1::int[])`;
          params = [userIds];
        }
        
        const result = await client.query(deleteQuery, params);
        if (result.rowCount > 0) {
          log.success(`Deleted ${result.rowCount} records from ${table}`);
          totalDeleted += result.rowCount;
        }
      } catch (error) {
        log.debug(`Skipped ${table} (${error.message})`);
      }
    }
    
    // Delete from users table
    const deleteUsersQuery = `DELETE FROM users WHERE user_id != $1`;
    const usersResult = await client.query(deleteUsersQuery, [ADMIN_USER_ID]);
    log.success(`Deleted ${usersResult.rowCount} users from users table`);
    totalDeleted += usersResult.rowCount;
    
    // Delete from user_names table
    if (nameIds.length > 0) {
      const deleteNamesQuery = `DELETE FROM user_names WHERE name_id = ANY($1::int[])`;
      const namesResult = await client.query(deleteNamesQuery, [nameIds]);
      log.success(`Deleted ${namesResult.rowCount} records from user_names table`);
      totalDeleted += namesResult.rowCount;
    }
    
    // Delete from addresses table
    if (addressIds.length > 0) {
      const deleteAddressesQuery = `DELETE FROM addresses WHERE address_id = ANY($1::int[])`;
      const addressesResult = await client.query(deleteAddressesQuery, [addressIds]);
      log.success(`Deleted ${addressesResult.rowCount} records from addresses table`);
      totalDeleted += addressesResult.rowCount;
    }
    
    await client.query('COMMIT');
    log.success(`✨ Successfully deleted all non-admin user data!`);
    log.success(`📊 Total records deleted: ${totalDeleted}`);
    log.success(`👤 Users deleted: ${users.length}`);
    log.success(`🛡️ Admin user (ID: ${ADMIN_USER_ID}) preserved`);
    
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    log.error(`Error during bulk deletion: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

async function showPreview() {
  log.header('DELETION PREVIEW');
  
  // Check admin user
  const admin = await getAdminUserInfo();
  if (!admin) {
    log.error(`Admin user with ID ${ADMIN_USER_ID} not found!`);
    return false;
  }
  
  log.success(`Admin user found: ${admin.first_name || 'Unknown'} ${admin.last_name || 'User'} (${admin.username})`);
  log.success(`Admin email: ${admin.email}`);
  log.success(`This user will be PRESERVED ✅`);
  
  // Get non-admin users
  const users = await getAllNonAdminUsers();
  
  if (users.length === 0) {
    log.info('No non-admin users found to delete');
    return false;
  }
  
  log.danger(`\n🚨 ${users.length} NON-ADMIN USERS WILL BE DELETED:`);
  console.log('');
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.first_name || 'Unknown'} ${user.last_name || 'User'} (ID: ${user.user_id})`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Status: ${user.registration_status}/${user.approval_status}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
  });
  
  return true;
}

async function main() {
  log.header('DELETE ALL USERS EXCEPT ADMIN');
  log.danger('🚨 WARNING: This will PERMANENTLY delete ALL user data except the admin!');
  log.danger('🚨 This action cannot be undone!');
  log.info(`Admin user ID to preserve: ${ADMIN_USER_ID}`);
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    log.success('Database connected successfully');
  } catch (error) {
    log.error(`Cannot connect to database: ${error.message}`);
    rl.close();
    return;
  }
  
  // Show preview
  const hasUsersToDelete = await showPreview();
  
  if (!hasUsersToDelete) {
    log.info('No users to delete. Exiting.');
    rl.close();
    return;
  }
  
  // Triple confirmation
  console.log('\n' + '='.repeat(60));
  log.danger('🚨 FINAL CONFIRMATION REQUIRED 🚨');
  console.log('='.repeat(60));
  
  const confirm1 = await prompt('Type "DELETE ALL" to confirm you want to delete all non-admin users: ');
  if (confirm1 !== 'DELETE ALL') {
    log.info('Deletion cancelled - confirmation text did not match');
    rl.close();
    return;
  }
  
  const confirm2 = await prompt('Are you absolutely sure? This cannot be undone! [yes/NO]: ');
  if (confirm2.toLowerCase() !== 'yes') {
    log.info('Deletion cancelled');
    rl.close();
    return;
  }
  
  const confirm3 = await prompt(`Final check: Type the admin user ID (${ADMIN_USER_ID}) to confirm: `);
  if (confirm3 !== ADMIN_USER_ID.toString()) {
    log.info('Deletion cancelled - admin user ID did not match');
    rl.close();
    return;
  }
  
  log.info('Starting deletion process...');
  const success = await deleteAllNonAdminUsers();
  
  if (success) {
    log.success('🎉 All non-admin users have been successfully deleted!');
    log.success(`🛡️ Admin user (ID: ${ADMIN_USER_ID}) has been preserved`);
  } else {
    log.error('❌ Deletion process failed');
  }
  
  rl.close();
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
