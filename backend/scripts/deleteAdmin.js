/**
 * Delete Admin Account Script
 * 
 * This script deletes an admin account from the WSBS system.
 * 
 * Usage:
 *   node scripts/deleteAdmin.js <username>
 * 
 * Example:
 *   node scripts/deleteAdmin.js admin
 *   node scripts/deleteAdmin.js oldadmin
 */

const readline = require('readline');
const { pool } = require('../config/db');
require('dotenv').config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Main function to delete admin account
async function deleteAdminAccount(username) {
  console.log(`\n${colors.bright}${colors.red}==============================================`);
  console.log(`     WSBS Admin Account Deletion Script`);
  console.log(`==============================================${colors.reset}\n`);

  const client = await pool.connect();
  
  try {
    // Find the admin user
    const findQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.name_id,
        n.first_name,
        n.middle_name,
        n.last_name,
        r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_names n ON u.name_id = n.name_id
      WHERE u.username = $1 AND r.role_name = 'admin';
    `;
    
    const result = await client.query(findQuery, [username]);

    if (result.rows.length === 0) {
      console.log(`${colors.red}❌ Admin account '${username}' not found.${colors.reset}\n`);
      return;
    }

    const admin = result.rows[0];
    const fullName = [admin.first_name, admin.middle_name, admin.last_name]
      .filter(Boolean)
      .join(' ');

    // Display admin details
    console.log(`${colors.yellow}⚠️  WARNING: You are about to delete the following admin account:${colors.reset}\n`);
    console.log(`${colors.cyan}Account Details:${colors.reset}`);
    console.log(`  User ID:   ${admin.user_id}`);
    console.log(`  Username:  ${colors.bright}${admin.username}${colors.reset}`);
    console.log(`  Full Name: ${fullName || 'N/A'}`);
    console.log(`  Role:      ${admin.role_name}\n`);

    // Confirmation prompt
    const confirmation = await question(
      `${colors.red}${colors.bright}Type 'DELETE' to confirm deletion: ${colors.reset}`
    );

    if (confirmation.trim() !== 'DELETE') {
      console.log(`\n${colors.yellow}Deletion cancelled.${colors.reset}\n`);
      return;
    }

    // Start transaction
    await client.query('BEGIN');

    console.log(`\n${colors.yellow}Deleting admin account...${colors.reset}\n`);

    // Delete user (this will cascade to related records if foreign keys are set up)
    const deleteUserQuery = `
      DELETE FROM users 
      WHERE user_id = $1 
      RETURNING user_id, username;
    `;
    const deleteResult = await client.query(deleteUserQuery, [admin.user_id]);

    // Delete associated name record
    if (admin.name_id) {
      const deleteNameQuery = `
        DELETE FROM user_names 
        WHERE name_id = $1;
      `;
      await client.query(deleteNameQuery, [admin.name_id]);
    }

    await client.query('COMMIT');

    // Success message
    console.log(`${colors.green}${colors.bright}✅ Admin account deleted successfully!${colors.reset}\n`);
    console.log(`${colors.cyan}Deleted Account:${colors.reset}`);
    console.log(`  User ID:  ${deleteResult.rows[0].user_id}`);
    console.log(`  Username: ${deleteResult.rows[0].username}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Parse command line arguments
function getUsername() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`${colors.red}Error: Username is required.${colors.reset}`);
    console.log(`\n${colors.cyan}Usage:${colors.reset}`);
    console.log(`  node scripts/deleteAdmin.js <username>`);
    console.log(`\n${colors.cyan}Example:${colors.reset}`);
    console.log(`  node scripts/deleteAdmin.js admin`);
    console.log(`  node scripts/deleteAdmin.js oldadmin\n`);
    console.log(`${colors.yellow}Tip: Use 'node scripts/listAdmins.js' to see all admin accounts.${colors.reset}\n`);
    process.exit(1);
  }
  
  return args[0];
}

// Run the script
const username = getUsername();

deleteAdminAccount(username)
  .then(() => {
    console.log(`${colors.green}Script completed successfully.${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n${colors.red}${colors.bright}❌ Error deleting admin account:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
    process.exit(1);
  })
  .finally(() => {
    rl.close();
    pool.end();
  });
