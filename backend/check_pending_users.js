#!/usr/bin/env node

/**
 * Check pending users with different filters
 */

const pool = require('./config/dbAdmin');

async function checkPendingUsers() {
  console.log('🔍 CHECKING PENDING USERS WITH DIFFERENT FILTERS\n');
  
  try {
    // Check all pending users regardless of email verification
    console.log('1. All users with registration_status = pending:');
    const allPendingQuery = `
      SELECT user_id, username, email, email_verified, approval_status, registration_status
      FROM users 
      WHERE registration_status = 'pending'
      ORDER BY created_at DESC
    `;
    const allPendingResult = await pool.query(allPendingQuery);
    console.log(`   Count: ${allPendingResult.rows.length}`);
    allPendingResult.rows.forEach(row => {
      console.log(`   - ${row.username} (${row.email}) - Email Verified: ${row.email_verified}, Approval: ${row.approval_status}`);
    });
    
    console.log('\n2. Users with registration_status = pending AND approval_status = pending:');
    const truePendingQuery = `
      SELECT user_id, username, email, email_verified, approval_status, registration_status
      FROM users 
      WHERE registration_status = 'pending' AND approval_status = 'pending'
      ORDER BY created_at DESC
    `;
    const truePendingResult = await pool.query(truePendingQuery);
    console.log(`   Count: ${truePendingResult.rows.length}`);
    truePendingResult.rows.forEach(row => {
      console.log(`   - ${row.username} (${row.email}) - Email Verified: ${row.email_verified}`);
    });
    
    console.log('\n3. Users with registration_status = pending AND approval_status = pending AND email_verified = true:');
    const emailVerifiedPendingQuery = `
      SELECT user_id, username, email, email_verified, approval_status, registration_status
      FROM users 
      WHERE registration_status = 'pending' AND approval_status = 'pending' AND email_verified = true
      ORDER BY created_at DESC
    `;
    const emailVerifiedResult = await pool.query(emailVerifiedPendingQuery);
    console.log(`   Count: ${emailVerifiedResult.rows.length}`);
    emailVerifiedResult.rows.forEach(row => {
      console.log(`   - ${row.username} (${row.email})`);
    });
    
    console.log('\n4. Users with registration_status = pending AND approval_status = pending (regardless of email_verified):');
    const shouldShowQuery = `
      SELECT user_id, username, email, email_verified, approval_status, registration_status
      FROM users 
      WHERE registration_status = 'pending' AND approval_status = 'pending'
      ORDER BY created_at DESC
    `;
    const shouldShowResult = await pool.query(shouldShowQuery);
    console.log(`   Count: ${shouldShowResult.rows.length}`);
    shouldShowResult.rows.forEach(row => {
      console.log(`   - ${row.username} (${row.email}) - Email Verified: ${row.email_verified}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkPendingUsers();
