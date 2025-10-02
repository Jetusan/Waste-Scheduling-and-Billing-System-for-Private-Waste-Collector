/**
 * List Admin Accounts Script
 * 
 * This script lists all admin accounts in the WSBS system.
 * 
 * Usage:
 *   node scripts/listAdmins.js
 */

const { pool } = require('../config/db');
require('dotenv').config();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Main function to list admin accounts
async function listAdminAccounts() {
  console.log(`\n${colors.bright}${colors.cyan}==============================================`);
  console.log(`     WSBS Admin Accounts List`);
  console.log(`==============================================${colors.reset}\n`);

  try {
    // Query to get all admin users via user_roles mapping
    const query = `
      SELECT 
        u.user_id,
        u.username,
        u.contact_number,
        u.created_at,
        n.first_name,
        n.middle_name,
        n.last_name,
        r.role_name
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON ur.role_id = r.role_id
      LEFT JOIN user_names n ON u.name_id = n.name_id
      WHERE r.role_name = 'admin'
      ORDER BY u.created_at DESC;
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log(`${colors.yellow}⚠️  No admin accounts found in the database.${colors.reset}`);
      console.log(`${colors.cyan}Create one using:${colors.reset}`);
      console.log(`  node scripts/quickCreateAdmin.js\n`);
      return;
    }

    console.log(`${colors.green}Found ${result.rows.length} admin account(s):${colors.reset}\n`);

    result.rows.forEach((admin, index) => {
      const fullName = [admin.first_name, admin.middle_name, admin.last_name]
        .filter(Boolean)
        .join(' ');
      
      console.log(`${colors.cyan}${colors.bright}[${index + 1}] Admin Account${colors.reset}`);
      console.log(`${colors.cyan}${'─'.repeat(50)}${colors.reset}`);
      console.log(`  ${colors.bright}User ID:${colors.reset}       ${admin.user_id}`);
      console.log(`  ${colors.bright}Username:${colors.reset}      ${colors.green}${admin.username}${colors.reset}`);
      console.log(`  ${colors.bright}Full Name:${colors.reset}     ${fullName || 'N/A'}`);
      console.log(`  ${colors.bright}Contact:${colors.reset}       ${admin.contact_number || 'N/A'}`);
      console.log(`  ${colors.bright}Role:${colors.reset}          ${colors.magenta}${admin.role_name}${colors.reset}`);
      console.log(`  ${colors.bright}Created:${colors.reset}       ${new Date(admin.created_at).toLocaleString()}`);
      console.log();
    });

    console.log(`${colors.cyan}${'═'.repeat(50)}${colors.reset}`);
    console.log(`${colors.green}Total Admin Accounts: ${result.rows.length}${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ Error listing admin accounts:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
    throw error;
  }
}

// Run the script
listAdminAccounts()
  .then(() => {
    console.log(`${colors.green}Script completed successfully.${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${colors.red}Script failed:${colors.reset}`, error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
