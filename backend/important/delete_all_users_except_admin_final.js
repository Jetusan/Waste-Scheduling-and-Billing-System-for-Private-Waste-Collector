#!/usr/bin/env node

/**
 * Delete All Users Except Admin Script - FINAL VERSION
 * Based on complete database schema analysis
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

async function deleteAllNonAdminUsersFinal() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    log.info('Starting final deletion of all non-admin users...');
    
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
    
    let totalDeleted = 0;
    
    // Based on schema analysis, delete in this exact order:
    
    // 1. Tables that reference other tables (leaf nodes first)
    const leafTables = [
      { name: 'receipts', column: 'user_id' },
      { name: 'collection_stop_events', column: 'user_id' },
      { name: 'special_pickup_requests', column: 'user_id' },
      { name: 'notifications', column: 'user_id' },
      { name: 'payment_attempts', column: 'user_id' },
      { name: 'manual_payment_verifications', column: 'user_id' },
      { name: 'gcash_qr_payments', column: 'user_id' },
      { name: 'feedback', column: 'user_id' },
      { name: 'password_reset_tokens', column: 'user_id' },
      { name: 'user_locations', column: 'user_id' },
      { name: 'resident_home_locations', column: 'user_id' },
      { name: 'assignment_stop_status', column: 'user_id' },
      { name: 'catchup_tasks', column: 'user_id' },
      { name: 'collection_actions', column: 'user_id' },
      { name: 'collection_followups', column: 'user_id' },
      { name: 'missed_collections', column: 'user_id' },
      { name: 'reschedule_tasks', column: 'user_id' },
      { name: 'resident_next_collections', column: 'user_id' },
      { name: 'route_stops', column: 'user_id' },
      { name: 'user_collection_results', column: 'user_id' },
      { name: 'payment_attempt_analytics', column: 'user_id' },
      { name: 'reports', column: 'user_id' }
    ];
    
    for (const table of leafTables) {
      try {
        const deleteQuery = `DELETE FROM ${table.name} WHERE ${table.column} = ANY($1::int[])`;
        const result = await client.query(deleteQuery, [userIds]);
        if (result.rowCount > 0) {
          log.success(`Deleted ${result.rowCount} records from ${table.name}`);
          totalDeleted += result.rowCount;
        }
      } catch (error) {
        log.debug(`Skipped ${table.name}: ${error.message}`);
      }
    }
    
    // 2. Delete invoices (references customer_subscriptions)
    try {
      const invoicesQuery = `DELETE FROM invoices WHERE user_id = ANY($1::int[])`;
      const invoicesResult = await client.query(invoicesQuery, [userIds]);
      if (invoicesResult.rowCount > 0) {
        log.success(`Deleted ${invoicesResult.rowCount} invoices`);
        totalDeleted += invoicesResult.rowCount;
      }
    } catch (error) {
      log.debug(`Invoices deletion error: ${error.message}`);
    }
    
    // 3. Delete customer_subscriptions (references users)
    try {
      const subscriptionsQuery = `DELETE FROM customer_subscriptions WHERE user_id = ANY($1::int[])`;
      const subscriptionsResult = await client.query(subscriptionsQuery, [userIds]);
      if (subscriptionsResult.rowCount > 0) {
        log.success(`Deleted ${subscriptionsResult.rowCount} customer_subscriptions`);
        totalDeleted += subscriptionsResult.rowCount;
      }
    } catch (error) {
      log.debug(`Subscriptions deletion error: ${error.message}`);
    }
    
    // 4. Delete payment_sources (might reference users)
    try {
      const paymentSourcesQuery = `DELETE FROM payment_sources WHERE user_id = ANY($1::int[])`;
      const paymentSourcesResult = await client.query(paymentSourcesQuery, [userIds]);
      if (paymentSourcesResult.rowCount > 0) {
        log.success(`Deleted ${paymentSourcesResult.rowCount} payment_sources`);
        totalDeleted += paymentSourcesResult.rowCount;
      }
    } catch (error) {
      log.debug(`Payment sources deletion error: ${error.message}`);
    }
    
    // 5. Delete collectors (references users)
    try {
      const collectorsQuery = `DELETE FROM collectors WHERE user_id = ANY($1::int[])`;
      const collectorsResult = await client.query(collectorsQuery, [userIds]);
      if (collectorsResult.rowCount > 0) {
        log.success(`Deleted ${collectorsResult.rowCount} collectors`);
        totalDeleted += collectorsResult.rowCount;
      }
    } catch (error) {
      log.debug(`Collectors deletion error: ${error.message}`);
    }
    
    // 6. Delete from users table
    const deleteUsersQuery = `DELETE FROM users WHERE user_id != $1`;
    const usersResult = await client.query(deleteUsersQuery, [ADMIN_USER_ID]);
    log.success(`Deleted ${usersResult.rowCount} users from users table`);
    totalDeleted += usersResult.rowCount;
    
    // 7. Delete from user_names table
    if (nameIds.length > 0) {
      try {
        const deleteNamesQuery = `DELETE FROM user_names WHERE name_id = ANY($1::int[])`;
        const namesResult = await client.query(deleteNamesQuery, [nameIds]);
        log.success(`Deleted ${namesResult.rowCount} records from user_names table`);
        totalDeleted += namesResult.rowCount;
      } catch (error) {
        log.debug(`User names deletion error: ${error.message}`);
      }
    }
    
    // 8. Delete from addresses table
    if (addressIds.length > 0) {
      try {
        const deleteAddressesQuery = `DELETE FROM addresses WHERE address_id = ANY($1::int[])`;
        const addressesResult = await client.query(deleteAddressesQuery, [addressIds]);
        log.success(`Deleted ${addressesResult.rowCount} records from addresses table`);
        totalDeleted += addressesResult.rowCount;
      } catch (error) {
        log.debug(`Addresses deletion error: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    log.success(`✨ Successfully deleted all non-admin user data!`);
    log.success(`📊 Total records deleted: ${totalDeleted}`);
    log.success(`👤 Users deleted: ${users.length}`);
    log.success(`🛡️ Admin user (ID: ${ADMIN_USER_ID}) preserved`);
    
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    log.error(`Error during final deletion: ${error.message}`);
    log.error(`Stack trace: ${error.stack}`);
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
  log.success(`Admin email: ${admin.email || 'null'}`);
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
  log.header('DELETE ALL USERS EXCEPT ADMIN - FINAL VERSION');
  log.danger('🚨 WARNING: This will PERMANENTLY delete ALL user data except the admin!');
  log.danger('🚨 This action cannot be undone!');
  log.info(`Admin user ID to preserve: ${ADMIN_USER_ID}`);
  log.info('🔧 Using complete database schema analysis for proper deletion order');
  
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
  
  log.info('Starting final deletion process...');
  const success = await deleteAllNonAdminUsersFinal();
  
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
