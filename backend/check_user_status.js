#!/usr/bin/env node

const pool = require('./config/dbAdmin');

async function checkUserStatus() {
  const email = process.argv[2] || 'markiews27@gmail.com';
  
  console.log(`🔍 Checking status for email: ${email}\n`);
  
  try {
    const query = `
      SELECT 
        u.user_id, u.username, u.email, 
        u.registration_status, u.approval_status,
        u.email_verified, u.created_at,
        un.first_name, un.last_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE u.email = $1
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ No users found with this email');
      process.exit(0);
    }
    
    console.log(`📊 Found ${result.rows.length} user(s) with this email:\n`);
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.user_id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Registration Status: ${user.registration_status}`);
      console.log(`   Approval Status: ${user.approval_status}`);
      console.log(`   Email Verified: ${user.email_verified}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Can Login: ${user.approval_status === 'approved' ? '✅ YES' : '❌ NO (waiting for approval)'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUserStatus();
