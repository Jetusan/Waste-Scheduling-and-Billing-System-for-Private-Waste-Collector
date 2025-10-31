const { pool } = require('./config/db');

async function checkTableStructures() {
  try {
    console.log('🔍 Checking table structures...');
    
    // Check users table structure
    console.log('\n👥 Users table structure:');
    const usersStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    usersStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Get sample users
    console.log('\n👥 Sample users:');
    const sampleUsers = await pool.query(`SELECT * FROM users LIMIT 5`);
    sampleUsers.rows.forEach(user => {
      console.log(`  - ID: ${user.user_id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
    // Check collectors table
    console.log('\n🚛 Collectors table structure:');
    const collectorsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'collectors' 
      ORDER BY ordinal_position;
    `);
    collectorsStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check subscription_plans table
    console.log('\n📋 Subscription plans table structure:');
    const plansStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'subscription_plans' 
      ORDER BY ordinal_position;
    `);
    plansStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check addresses and barangays
    console.log('\n🏠 Addresses table structure:');
    const addressesStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      ORDER BY ordinal_position;
    `);
    addressesStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n🏘️ Barangays table structure:');
    const barangaysStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'barangays' 
      ORDER BY ordinal_position;
    `);
    barangaysStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking table structures:', error);
  } finally {
    await pool.end();
  }
}

checkTableStructures();
