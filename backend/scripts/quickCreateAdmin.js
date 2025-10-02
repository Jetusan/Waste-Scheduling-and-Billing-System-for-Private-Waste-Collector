/**
 * Quick Admin Account Creation Script
 * 
 * This script quickly creates an admin account with predefined or command-line values.
 * 
 * Usage:
 *   node scripts/quickCreateAdmin.js <username> <password> <firstName> <lastName>
 * 
 * Example:
 *   node scripts/quickCreateAdmin.js admin admin123 John Doe
 *   node scripts/quickCreateAdmin.js superadmin SecurePass123 Jane Smith
 * 
 * Or edit the DEFAULT_ADMIN object below and run:
 *   node scripts/quickCreateAdmin.js
 */

const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
require('dotenv').config();

// Default admin credentials (edit these if you want)
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  firstName: 'Admin',
  middleName: null,
  lastName: 'User',
  contactNumber: '09123456789'
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Main function to create admin account
async function quickCreateAdmin(adminData) {
  console.log(`\n${colors.bright}${colors.cyan}==============================================`);
  console.log(`     WSBS Quick Admin Creation Script`);
  console.log(`==============================================${colors.reset}\n`);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log(`${colors.yellow}Creating admin account for: ${adminData.username}${colors.reset}\n`);

    // Check if username already exists
    const usernameCheck = await client.query(
      'SELECT user_id, username FROM users WHERE username = $1',
      [adminData.username]
    );

    if (usernameCheck.rows.length > 0) {
      console.log(`${colors.yellow}⚠️  Username '${adminData.username}' already exists!${colors.reset}`);
      console.log(`${colors.cyan}Existing account details:${colors.reset}`);
      console.log(`  User ID:  ${usernameCheck.rows[0].user_id}`);
      console.log(`  Username: ${usernameCheck.rows[0].username}\n`);
      
      await client.query('ROLLBACK');
      return;
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(adminData.password, saltRounds);

    // Insert into user_names table
    const nameQuery = `
      INSERT INTO user_names (first_name, middle_name, last_name)
      VALUES ($1, $2, $3)
      RETURNING name_id;
    `;
    const nameResult = await client.query(nameQuery, [
      adminData.firstName,
      adminData.middleName,
      adminData.lastName
    ]);
    const nameId = nameResult.rows[0].name_id;

    // Ensure 'admin' role exists and get its id
    const roleUpsert = `
      INSERT INTO roles (role_name)
      VALUES ('admin')
      ON CONFLICT (role_name) DO UPDATE SET role_name = EXCLUDED.role_name
      RETURNING role_id;
    `;
    const roleResult = await client.query(roleUpsert);
    const adminRoleId = roleResult.rows[0].role_id;

    // Insert into users table (address_id nullable, no role_id/updated_at)
    const userQuery = `
      INSERT INTO users (username, password_hash, contact_number, address_id, name_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING user_id, username, created_at;
    `;
    const userResult = await client.query(userQuery, [
      adminData.username,
      password_hash,
      adminData.contactNumber || '000-000-0000',
      null,
      nameId
    ]);

    // Assign admin role via user_roles
    const newUserId = userResult.rows[0].user_id;
    const userRoleQuery = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `;
    await client.query(userRoleQuery, [newUserId, adminRoleId]);

    await client.query('COMMIT');

    const newAdmin = userResult.rows[0];

    // Success message
    console.log(`${colors.green}${colors.bright}✅ Admin account created successfully!${colors.reset}\n`);
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}Account Details:${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);
    console.log(`  ${colors.bright}User ID:${colors.reset}      ${newAdmin.user_id}`);
    console.log(`  ${colors.bright}Username:${colors.reset}     ${colors.green}${newAdmin.username}${colors.reset}`);
    console.log(`  ${colors.bright}Password:${colors.reset}     ${colors.green}${adminData.password}${colors.reset}`);
    console.log(`  ${colors.bright}Full Name:${colors.reset}    ${adminData.firstName} ${adminData.middleName ? adminData.middleName + ' ' : ''}${adminData.lastName}`);
    console.log(`  ${colors.bright}Contact:${colors.reset}      ${adminData.contactNumber || 'Not provided'}`);
    console.log(`  ${colors.bright}Created At:${colors.reset}   ${newAdmin.created_at}`);
    console.log(`  ${colors.bright}Role:${colors.reset}         ${colors.cyan}Admin${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);
    console.log(`${colors.yellow}${colors.bright}🔐 Login Credentials:${colors.reset}`);
    console.log(`   Username: ${colors.green}${newAdmin.username}${colors.reset}`);
    console.log(`   Password: ${colors.green}${adminData.password}${colors.reset}\n`);
    console.log(`${colors.cyan}You can now login to the admin dashboard at:${colors.reset}`);
    console.log(`${colors.bright}http://localhost:3000/login${colors.reset}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Parse command line arguments or use defaults
function getAdminData() {
  const args = process.argv.slice(2);
  
  if (args.length >= 4) {
    return {
      username: args[0],
      password: args[1],
      firstName: args[2],
      middleName: args[4] || null,
      lastName: args[3],
      contactNumber: args[5] || null
    };
  } else if (args.length > 0 && args.length < 4) {
    console.log(`${colors.red}Error: Invalid number of arguments.${colors.reset}`);
    console.log(`\n${colors.cyan}Usage:${colors.reset}`);
    console.log(`  node scripts/quickCreateAdmin.js <username> <password> <firstName> <lastName> [middleName] [contactNumber]`);
    console.log(`\n${colors.cyan}Example:${colors.reset}`);
    console.log(`  node scripts/quickCreateAdmin.js admin admin123 John Doe`);
    console.log(`  node scripts/quickCreateAdmin.js superadmin SecurePass123 Jane Smith M 09123456789\n`);
    process.exit(1);
  }
  
  // Use default values
  console.log(`${colors.yellow}No arguments provided. Using default admin credentials.${colors.reset}`);
  console.log(`${colors.cyan}To create custom admin, use:${colors.reset}`);
  console.log(`  node scripts/quickCreateAdmin.js <username> <password> <firstName> <lastName>\n`);
  
  return DEFAULT_ADMIN;
}

// Run the script
const adminData = getAdminData();

quickCreateAdmin(adminData)
  .then(() => {
    console.log(`${colors.green}Script completed successfully.${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n${colors.red}${colors.bright}❌ Error creating admin account:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
