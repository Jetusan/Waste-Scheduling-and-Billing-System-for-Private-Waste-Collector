/**
 * Admin Account Creation Script
 * 
 * This script creates a new admin account in the WSBS system.
 * 
 * Usage:
 *   node scripts/createAdmin.js
 * 
 * You will be prompted to enter:
 *   - Username
 *   - Password
 *   - First Name
 *   - Middle Name (optional)
 *   - Last Name
 *   - Contact Number (optional)
 */

const readline = require('readline');
const bcrypt = require('bcrypt');
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

// Main function to create admin account
async function createAdminAccount() {
  console.log(`\n${colors.bright}${colors.cyan}==============================================`);
  console.log(`     WSBS Admin Account Creation Script`);
  console.log(`==============================================${colors.reset}\n`);

  try {
    // Collect admin information
    const username = await question(`${colors.cyan}Enter username: ${colors.reset}`);
    if (!username || username.trim() === '') {
      throw new Error('Username is required');
    }

    const password = await question(`${colors.cyan}Enter password: ${colors.reset}`);
    if (!password || password.trim() === '') {
      throw new Error('Password is required');
    }

    const firstName = await question(`${colors.cyan}Enter first name: ${colors.reset}`);
    if (!firstName || firstName.trim() === '') {
      throw new Error('First name is required');
    }

    const middleName = await question(`${colors.cyan}Enter middle name (optional, press Enter to skip): ${colors.reset}`);
    
    const lastName = await question(`${colors.cyan}Enter last name: ${colors.reset}`);
    if (!lastName || lastName.trim() === '') {
      throw new Error('Last name is required');
    }

    const contactNumber = await question(`${colors.cyan}Enter contact number (optional, press Enter to skip): ${colors.reset}`);

    console.log(`\n${colors.yellow}Creating admin account...${colors.reset}\n`);

    // Start database transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if username already exists
      const usernameCheck = await client.query(
        'SELECT user_id FROM users WHERE username = $1',
        [username.trim()]
      );

      if (usernameCheck.rows.length > 0) {
        throw new Error(`Username '${username}' already exists`);
      }

      // Hash the password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Insert into user_names table
      const nameQuery = `
        INSERT INTO user_names (first_name, middle_name, last_name)
        VALUES ($1, $2, $3)
        RETURNING name_id;
      `;
      const nameResult = await client.query(nameQuery, [
        firstName.trim(),
        middleName.trim() || null,
        lastName.trim()
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

      // Insert into users table (no role_id, no updated_at; address_id nullable)
      const userQuery = `
        INSERT INTO users (username, password_hash, contact_number, address_id, name_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING user_id, username, created_at;
      `;
      const userResult = await client.query(userQuery, [
        username.trim(),
        password_hash,
        (contactNumber && contactNumber.trim()) || '000-000-0000',
        null,
        nameId
      ]);

      // Map user to admin role via user_roles table
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
      console.log(`${colors.cyan}Account Details:${colors.reset}`);
      console.log(`  User ID:      ${newAdmin.user_id}`);
      console.log(`  Username:     ${newAdmin.username}`);
      console.log(`  Full Name:    ${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`);
      console.log(`  Contact:      ${contactNumber || 'Not provided'}`);
      console.log(`  Created At:   ${newAdmin.created_at}`);
      console.log(`  Role:         Admin\n`);
      console.log(`${colors.yellow}You can now login to the admin dashboard with these credentials.${colors.reset}\n`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ Error creating admin account:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Run the script
createAdminAccount()
  .then(() => {
    console.log(`${colors.green}Script completed successfully.${colors.reset}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${colors.red}Script failed:${colors.reset}`, error);
    process.exit(1);
  });
