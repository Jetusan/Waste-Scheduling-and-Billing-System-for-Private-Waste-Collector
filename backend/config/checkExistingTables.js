const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'waste_collection_db',
  password: 'root',
  port: 5432,
});

async function checkExistingTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking existing tables in waste_collection_db...\n');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 All tables in waste_collection_db:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check users table structure
    console.log('\n📋 Users table structure:');
    const usersStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    usersStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Check residents table structure
    console.log('\n📋 Residents table structure:');
    const residentsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'residents'
      ORDER BY ordinal_position;
    `);
    
    residentsStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Check collectors table structure
    console.log('\n📋 Collectors table structure:');
    const collectorsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'collectors'
      ORDER BY ordinal_position;
    `);
    
    collectorsStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Check invoices table structure
    console.log('\n📋 Invoices table structure:');
    const invoicesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position;
    `);
    invoicesStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Sample data from users table
    console.log('\n📋 Sample users data:');
    const usersData = await client.query('SELECT * FROM users LIMIT 3');
    console.log(`   Found ${usersData.rows.length} users`);
    usersData.rows.forEach(user => {
      console.log(`   - User ID: ${user.user_id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
    // Sample data from residents table
    console.log('\n📋 Sample residents data:');
    const residentsData = await client.query('SELECT * FROM residents LIMIT 3');
    console.log(`   Found ${residentsData.rows.length} residents`);
    residentsData.rows.forEach(resident => {
      console.log(`   - Resident ID: ${resident.resident_id}, User ID: ${resident.user_id}, Address: ${resident.address}`);
    });
    
    // Sample data from collectors table
    console.log('\n📋 Sample collectors data:');
    const collectorsData = await client.query('SELECT * FROM collectors LIMIT 3');
    console.log(`   Found ${collectorsData.rows.length} collectors`);
    collectorsData.rows.forEach(collector => {
      console.log(`   - Collector ID: ${collector.collector_id}, User ID: ${collector.user_id}, License: ${collector.license_number}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkExistingTables()
    .then(() => {
      console.log('\n✅ Table check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Table check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkExistingTables }; 