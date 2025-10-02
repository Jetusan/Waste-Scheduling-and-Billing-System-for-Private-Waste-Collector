#!/usr/bin/env node

/**
 * Fix existing approved users - update registration_status to match approval_status
 */

const pool = require('./config/dbAdmin');

async function fixApprovedUsers() {
  console.log('🔧 Fixing approved users...\n');
  
  try {
    // Update all users where approval_status = 'approved' but registration_status = 'pending'
    const updateQuery = `
      UPDATE users
      SET registration_status = 'approved'
      WHERE approval_status = 'approved' 
      AND registration_status = 'pending'
      RETURNING user_id, username, email
    `;
    
    const result = await pool.query(updateQuery);
    
    if (result.rows.length === 0) {
      console.log('✅ No users need fixing - all approved users already have correct registration_status');
    } else {
      console.log(`✅ Fixed ${result.rows.length} user(s):\n`);
      result.rows.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - ID: ${user.user_id}`);
      });
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

fixApprovedUsers();
