// Check database schema for user and barangay relationships
const { pool } = require('./config/db');

async function checkSchema() {
  try {
    console.log('🔍 Checking Database Schema...\n');
    
    // Check users table structure
    const usersSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('👤 USERS TABLE STRUCTURE:');
    usersSchema.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check barangays table structure
    const barangaysSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'barangays' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n🏘️ BARANGAYS TABLE STRUCTURE:');
    barangaysSchema.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check user_addresses table if it exists
    const userAddressSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_addresses' 
      ORDER BY ordinal_position
    `);
    
    if (userAddressSchema.rows.length > 0) {
      console.log('\n🏠 USER_ADDRESSES TABLE STRUCTURE:');
      userAddressSchema.rows.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    // Sample data check
    const sampleUsers = await pool.query('SELECT user_id, username, role FROM users LIMIT 5');
    console.log('\n📋 SAMPLE USERS:');
    sampleUsers.rows.forEach(user => {
      console.log(`   ID: ${user.user_id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    const sampleBarangays = await pool.query('SELECT barangay_id, barangay_name FROM barangays LIMIT 10');
    console.log('\n🏘️ SAMPLE BARANGAYS:');
    sampleBarangays.rows.forEach(barangay => {
      console.log(`   ID: ${barangay.barangay_id}, Name: ${barangay.barangay_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
