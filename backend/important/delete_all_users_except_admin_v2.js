#!/usr/bin/env node

/**
 * Delete All Users Except Admin Script - Version 2
 * Uses a more systematic approach to handle complex foreign key relationships
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

async function deleteAllNonAdminUsersSystematic() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    log.info('Starting systematic deletion of all non-admin users...');
    
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
    
    // Step 1: Delete receipts (references invoices and users)
    try {
      const receiptsQuery = `DELETE FROM receipts WHERE user_id = ANY($1::int[])`;
      const receiptsResult = await client.query(receiptsQuery, [userIds]);
      if (receiptsResult.rowCount > 0) {
        log.success(`Deleted ${receiptsResult.rowCount} records from receipts`);
        totalDeleted += receiptsResult.rowCount;
      }
    } catch (error) {
      log.debug(`Skipped receipts: ${error.message}`);
    }
    
    // Step 2: Delete ALL invoices for non-admin users (try multiple approaches)
    try {
      // First try resident_id
      const invoicesQuery1 = `DELETE FROM invoices WHERE resident_id = ANY($1::int[])`;
      const invoicesResult1 = await client.query(invoicesQuery1, [userIds]);
      if (invoicesResult1.rowCount > 0) {
        log.success(`Deleted ${invoicesResult1.rowCount} invoices by resident_id`);
        totalDeleted += invoicesResult1.rowCount;
      }
      
      // Then try user_id if column exists
      const invoicesQuery2 = `DELETE FROM invoices WHERE user_id = ANY($1::int[])`;
      const invoicesResult2 = await client.query(invoicesQuery2, [userIds]);
      if (invoicesResult2.rowCount > 0) {
        log.success(`Deleted ${invoicesResult2.rowCount} invoices by user_id`);
        totalDeleted += invoicesResult2.rowCount;
      }
      
      // Delete invoices through subscription relationship
      const invoicesQuery3 = `
        DELETE FROM invoices 
        WHERE subscription_id IN (
          SELECT subscription_id FROM customer_subscriptions 
          WHERE user_id = ANY($1::int[])
        )
      `;
      const invoicesResult3 = await client.query(invoicesQuery3, [userIds]);
      if (invoicesResult3.rowCount > 0) {
        log.success(`Deleted ${invoicesResult3.rowCount} invoices by subscription`);
        totalDeleted += invoicesResult3.rowCount;
      }
      
    } catch (error) {
      log.debug(`Invoice deletion error: ${error.message}`);
    }
    
    // Step 3: Delete customer_subscriptions
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
    
    // Step 4: Delete from other related tables
    const otherTables = [
      'collection_stop_events',
      'special_pickup_requests',
      'user_locations',
      'collection_actions',
      'notifications',
      'collector_assignments',
      'user_sessions'
    ];
    
    for (const table of otherTables) {
      try {
        const deleteQuery = `DELETE FROM ${table} WHERE user_id = ANY($1::int[])`;
        const result = await client.query(deleteQuery, [userIds]);
        if (result.rowCount > 0) {
          log.success(`Deleted ${result.rowCount} records from ${table}`);
          totalDeleted += result.rowCount;
        }
      } catch (error) {
        log.debug(`Skipped ${table}: ${error.message}`);
      }
    }
    
    // Step 5: Handle payment_sources (might use different column name)
    try {
      // Try user_id first
      const paymentQuery1 = `DELETE FROM payment_sources WHERE user_id = ANY($1::int[])`;
      const paymentResult1 = await client.query(paymentQuery1, [userIds]);
      if (paymentResult1.rowCount > 0) {
        log.success(`Deleted ${paymentResult1.rowCount} payment_sources by user_id`);
        totalDeleted += paymentResult1.rowCount;
      }
    } catch (error) {
      try {
        // Try resident_id
        const paymentQuery2 = `DELETE FROM payment_sources WHERE resident_id = ANY($1::int[])`;
        const paymentResult2 = await client.query(paymentQuery2, [userIds]);
        if (paymentResult2.rowCount > 0) {
          log.success(`Deleted ${paymentResult2.rowCount} payment_sources by resident_id`);
          totalDeleted += paymentResult2.rowCount;
        }
      } catch (error2) {
        log.debug(`Skipped payment_sources: ${error2.message}`);
      }
    }
    
    // Step 6: Delete from users table
    const deleteUsersQuery = `DELETE FROM users WHERE user_id != $1`;
    const usersResult = await client.query(deleteUsersQuery, [ADMIN_USER_ID]);
    log.success(`Deleted ${usersResult.rowCount} users from users table`);
    totalDeleted += usersResult.rowCount;
    
    // Step 7: Delete from user_names table
    if (nameIds.length > 0) {
      const deleteNamesQuery = `DELETE FROM user_names WHERE name_id = ANY($1::int[])`;
      const namesResult = await client.query(deleteNamesQuery, [nameIds]);
      log.success(`Deleted ${namesResult.rowCount} records from user_names table`);
      totalDeleted += namesResult.rowCount;
    }
    
    // Step 8: Delete from addresses table
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
    log.error(`Error during systematic deletion: ${error.message}`);
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
  log.header('DELETE ALL USERS EXCEPT ADMIN - V2');
  log.danger('🚨 WARNING: This will PERMANENTLY delete ALL user data except the admin!');
  log.danger('🚨 This action cannot be undone!');
  log.info(`Admin user ID to preserve: ${ADMIN_USER_ID}`);
  log.info('🔧 Using systematic deletion approach to handle complex relationships');
  
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
  
  log.info('Starting systematic deletion process...');
  const success = await deleteAllNonAdminUsersSystematic();
  
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
