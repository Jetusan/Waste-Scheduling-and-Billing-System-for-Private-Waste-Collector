#!/usr/bin/env node

/**
 * Check data inside users table
 */

const pool = require('./config/dbAdmin');

async function checkUsersData() {
  console.log('🔍 CHECKING USERS TABLE DATA\n');

  try {
    // Count how many users exist
    const countResult = await pool.query(`SELECT COUNT(*) AS total_users FROM users`);
    console.log(`📊 Total users: ${countResult.rows[0].total_users}\n`);

    // Fetch first 10 users for preview
    const usersResult = await pool.query(`
      SELECT user_id, username, email, registration_status, approval_status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (usersResult.rows.length === 0) {
      console.log('📄 No users found in the table');
    } else {
      console.log('📋 Sample users:');
      usersResult.rows.forEach(user => {
        console.log(`- ID: ${user.user_id}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Status: ${user.registration_status}/${user.approval_status}`);
        console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Example: show only pending users (optional)
    const pendingResult = await pool.query(`
      SELECT user_id, username, email, created_at
      FROM users
      WHERE registration_status = 'pending' OR approval_status = 'pending'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (pendingResult.rows.length > 0) {
      console.log('📌 Pending users:');
      pendingResult.rows.forEach(u => {
        console.log(`- ${u.username} (${u.email}) [ID: ${u.user_id}] created ${new Date(u.created_at).toLocaleString()}`);
      });
    } else {
      console.log('✅ No pending users found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsersData();
