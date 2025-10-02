#!/usr/bin/env node

/**
 * Debug Pending Registrations Script
 * Checks what's actually in the database for pending registrations
 */

const pool = require('./config/dbAdmin');

async function debugPendingRegistrations() {
  console.log('🔍 DEBUGGING PENDING REGISTRATIONS\n');
  
  try {
    // Check all users with pending status regardless of email verification
    const allPendingQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.email_verified,
        u.registration_status,
        u.created_at,
        un.first_name,
        un.last_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.registration_status = 'pending'
      ORDER BY u.created_at DESC
    `;
    
    const allPendingResult = await pool.query(allPendingQuery);
    
    console.log(`📊 Total pending registrations: ${allPendingResult.rows.length}\n`);
    
    if (allPendingResult.rows.length > 0) {
      console.log('📋 All pending registrations:');
      allPendingResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.first_name} ${row.last_name}`);
        console.log(`   Email: ${row.email}`);
        console.log(`   Username: ${row.username}`);
        console.log(`   Email Verified: ${row.email_verified ? '✅' : '❌'}`);
        console.log(`   Registration Status: ${row.registration_status}`);
        console.log(`   Created: ${new Date(row.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    // Check how many are email verified
    const emailVerifiedQuery = `
      SELECT COUNT(*) as count
      FROM users 
      WHERE registration_status = 'pending' 
      AND email_verified = true
    `;
    
    const emailVerifiedResult = await pool.query(emailVerifiedQuery);
    const emailVerifiedCount = emailVerifiedResult.rows[0].count;
    
    console.log(`📧 Email verified pending registrations: ${emailVerifiedCount}`);
    console.log(`📧 Email NOT verified pending registrations: ${allPendingResult.rows.length - emailVerifiedCount}`);
    
    // Check registration statistics
    const statsQuery = `
      SELECT 
        registration_status,
        COUNT(*) as count
      FROM users 
      GROUP BY registration_status
      ORDER BY registration_status
    `;
    
    const statsResult = await pool.query(statsQuery);
    
    console.log('\n📊 Registration Status Breakdown:');
    statsResult.rows.forEach(row => {
      console.log(`   ${row.registration_status}: ${row.count}`);
    });
    
    // Check email verification breakdown
    const emailStatsQuery = `
      SELECT 
        email_verified,
        registration_status,
        COUNT(*) as count
      FROM users 
      GROUP BY email_verified, registration_status
      ORDER BY registration_status, email_verified
    `;
    
    const emailStatsResult = await pool.query(emailStatsQuery);
    
    console.log('\n📧 Email Verification Breakdown:');
    emailStatsResult.rows.forEach(row => {
      const verified = row.email_verified ? 'Verified' : 'Not Verified';
      console.log(`   ${row.registration_status} + ${verified}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    process.exit(0);
  }
}

debugPendingRegistrations();
