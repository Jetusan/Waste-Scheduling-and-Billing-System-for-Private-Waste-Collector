/**
 * DELETE USER DATA FOR FRESH START - VERSION 2
 * 
 * This script completely removes all data associated with a user to allow them
 * to start fresh in the system. Use with extreme caution as this is irreversible.
 * 
 * Usage:
 * node important/delete_user_data_fresh_start_v2.js <user_id>
 * 
 * Example:
 * node important/delete_user_data_fresh_start_v2.js 123
 */

const { Pool } = require('pg');
const readline = require('readline');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'neondb',
  user: process.env.DB_USER || 'neondb_owner',
  password: process.env.DB_PASSWORD || 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getUserInfo(userId) {
  try {
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown User') as full_name,
        u.role_id,
        u.approval_status,
        u.created_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching user info:', error);
    return null;
  }
}

async function getDataSummary(userId) {
  const queries = [
    { key: 'subscriptions', query: `SELECT COUNT(*) as count FROM customer_subscriptions WHERE user_id = $1` },
    { key: 'invoices', query: `SELECT COUNT(*) as count FROM invoices WHERE user_id = $1` },
    { key: 'payments', query: `SELECT COUNT(p.*) as count FROM payments p JOIN invoices i ON p.invoice_id = i.invoice_id WHERE i.user_id = $1` },
    { key: 'specialPickups', query: `SELECT COUNT(*) as count FROM special_pickup_requests WHERE user_id = $1` },
    { key: 'manualPayments', query: `SELECT COUNT(*) as count FROM manual_payment_verifications WHERE user_id = $1` },
    { key: 'collectionEvents', query: `SELECT COUNT(*) as count FROM collection_stop_events WHERE user_id = $1` },
    { key: 'notifications', query: `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1` },
    { key: 'receipts', query: `SELECT COUNT(*) as count FROM receipts WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE user_id = $1)`, optional: true },
    { key: 'addresses', query: `SELECT COUNT(*) as count FROM addresses WHERE address_id IN (SELECT address_id FROM users WHERE user_id = $1)` },
    { key: 'userNames', query: `SELECT COUNT(*) as count FROM user_names WHERE name_id IN (SELECT name_id FROM users WHERE user_id = $1)` }
  ];

  const summary = {};
  for (const { key, query, optional } of queries) {
    try {
      const result = await pool.query(query, [userId]);
      summary[key] = parseInt(result.rows[0].count);
    } catch (error) {
      if (optional && (error.code === '42P01' || error.code === '42703')) {
        summary[key] = 0;
      } else {
        console.error(`❌ Error getting ${key} count:`, error.message);
        summary[key] = 0;
      }
    }
  }

  return summary;
}

async function deleteUserData(userId) {
  // Define deletion steps in proper order
  const deletionSteps = [
    {
      name: 'Collection Stop Events',
      query: 'DELETE FROM collection_stop_events WHERE user_id = $1',
      description: 'Remove collection history'
    },
    {
      name: 'Notifications',
      query: 'DELETE FROM notifications WHERE user_id = $1',
      description: 'Remove user notifications'
    },
    {
      name: 'Manual Payment Verifications',
      query: 'DELETE FROM manual_payment_verifications WHERE user_id = $1',
      description: 'Remove manual payment records'
    },
    {
      name: 'Receipts (via invoices)',
      query: `DELETE FROM receipts WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE user_id = $1)`,
      description: 'Remove receipts',
      optional: true
    },
    {
      name: 'Payments (via invoices)',
      query: `DELETE FROM payments WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE user_id = $1)`,
      description: 'Remove payment records'
    },
    {
      name: 'Payment Sources (via invoices)',
      query: `DELETE FROM payment_sources WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE user_id = $1)`,
      description: 'Remove payment source records',
      optional: true
    },
    {
      name: 'Special Pickup Requests',
      query: 'DELETE FROM special_pickup_requests WHERE user_id = $1',
      description: 'Remove special pickup requests'
    },
    {
      name: 'Invoices',
      query: 'DELETE FROM invoices WHERE user_id = $1',
      description: 'Remove invoice records'
    },
    {
      name: 'Customer Subscriptions',
      query: 'DELETE FROM customer_subscriptions WHERE user_id = $1',
      description: 'Remove subscription records'
    },
    {
      name: 'User Account',
      query: 'DELETE FROM users WHERE user_id = $1',
      description: 'Remove main user account'
    },
    {
      name: 'User Addresses',
      query: `DELETE FROM addresses WHERE address_id NOT IN (SELECT DISTINCT address_id FROM users WHERE address_id IS NOT NULL)`,
      description: 'Remove orphaned user addresses',
      optional: true
    },
    {
      name: 'User Names',
      query: `DELETE FROM user_names WHERE name_id NOT IN (SELECT DISTINCT name_id FROM users WHERE name_id IS NOT NULL)`,
      description: 'Remove orphaned user name records',
      optional: true
    }
  ];

  console.log('🔄 Starting user data deletion...');
  let totalDeleted = 0;
  let errors = [];

  // Execute each deletion step individually (no transaction for better error handling)
  for (const step of deletionSteps) {
    console.log(`🗑️  ${step.description}...`);
    try {
      const result = await pool.query(step.query, [userId]);
      const deletedCount = result.rowCount;
      totalDeleted += deletedCount;
      console.log(`   ✅ Deleted ${deletedCount} ${step.name.toLowerCase()} records`);
    } catch (error) {
      if (step.optional && (error.code === '42P01' || error.code === '42703')) {
        console.log(`   ⚠️  Skipped ${step.name.toLowerCase()} (table/column not found)`);
      } else {
        console.log(`   ❌ Error deleting ${step.name.toLowerCase()}: ${error.message}`);
        errors.push({ step: step.name, error: error.message });
        
        // For critical errors (like user deletion), stop the process
        if (step.name === 'User Account') {
          throw error;
        }
      }
    }
  }

  // Refresh materialized view if it exists
  try {
    await pool.query('REFRESH MATERIALIZED VIEW user_ledger_entries');
    console.log('🔄 Refreshed ledger materialized view');
  } catch (error) {
    console.log('⚠️  Ledger materialized view not found (this is normal)');
  }

  console.log(`✅ User data deletion completed!`);
  console.log(`📊 Total records deleted: ${totalDeleted}`);
  
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} non-critical errors occurred:`);
    errors.forEach(err => console.log(`   • ${err.step}: ${err.error}`));
  }

  return true;
}

async function confirmDeletion(userInfo, dataSummary) {
  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This action is IRREVERSIBLE!');
    console.log('📋 User Information:');
    console.log(`   • User ID: ${userInfo.user_id}`);
    console.log(`   • Username: ${userInfo.username}`);
    console.log(`   • Email: ${userInfo.email}`);
    console.log(`   • Full Name: ${userInfo.full_name}`);
    console.log(`   • Role: ${userInfo.role_id === 3 ? 'Resident' : userInfo.role_id === 2 ? 'Collector' : 'Admin'}`);
    console.log(`   • Status: ${userInfo.approval_status}`);
    console.log(`   • Created: ${userInfo.created_at}`);
    
    console.log('\n📊 Data to be deleted:');
    console.log(`   • Subscriptions: ${dataSummary.subscriptions}`);
    console.log(`   • Invoices: ${dataSummary.invoices}`);
    console.log(`   • Payments: ${dataSummary.payments}`);
    console.log(`   • Receipts: ${dataSummary.receipts}`);
    console.log(`   • Special Pickups: ${dataSummary.specialPickups}`);
    console.log(`   • Manual Payments: ${dataSummary.manualPayments}`);
    console.log(`   • Collection Events: ${dataSummary.collectionEvents}`);
    console.log(`   • Notifications: ${dataSummary.notifications}`);
    console.log(`   • Addresses: ${dataSummary.addresses}`);
    console.log(`   • User Names: ${dataSummary.userNames}`);
    
    const totalRecords = Object.values(dataSummary).reduce((sum, count) => sum + count, 0) + 1;
    console.log(`\n🔢 Total records to delete: ${totalRecords}`);
    
    rl.question('\nType "DELETE FOREVER" to confirm deletion: ', (answer) => {
      resolve(answer === 'DELETE FOREVER');
    });
  });
}

async function main() {
  try {
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('❌ Usage: node delete_user_data_fresh_start_v2.js <user_id>');
      process.exit(1);
    }

    if (isNaN(userId)) {
      console.error('❌ User ID must be a number');
      process.exit(1);
    }

    console.log(`🔍 Looking up user ${userId}...`);
    
    // Get user information
    const userInfo = await getUserInfo(userId);
    if (!userInfo) {
      console.error(`❌ User ${userId} not found`);
      process.exit(1);
    }

    // Get data summary
    const dataSummary = await getDataSummary(userId);
    
    // Confirm deletion
    const confirmed = await confirmDeletion(userInfo, dataSummary);
    
    if (!confirmed) {
      console.log('❌ Deletion cancelled');
      process.exit(0);
    }

    // Perform deletion
    await deleteUserData(userId);
    
    console.log('\n🎉 User data deletion completed successfully!');
    console.log('💡 The user can now register again with a fresh start.');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Safety check - prevent accidental execution
if (require.main === module) {
  console.log('🚨 USER DATA DELETION SCRIPT - VERSION 2');
  console.log('⚠️  This script will permanently delete ALL user data');
  console.log('🔒 Use only for fresh start scenarios\n');
  
  main().catch(console.error);
}

module.exports = { deleteUserData, getUserInfo, getDataSummary };
