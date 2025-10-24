// Check how users are related to barangays in the database
const { pool } = require('./config/db');

async function checkUserBarangayRelation() {
  try {
    console.log('🔍 Checking User-Barangay Relationship...\n');
    
    // Check all tables that might contain location data
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%user%' OR table_name LIKE '%address%' OR table_name LIKE '%barangay%'
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log('📋 RELEVANT TABLES:');
    tablesResult.rows.forEach(table => {
      console.log(`   ${table.table_name}`);
    });
    
    // Check if there's a direct barangay field in users table
    const usersColumnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND (column_name LIKE '%barangay%' OR column_name LIKE '%address%' OR column_name LIKE '%location%')
    `;
    
    const usersColumnsResult = await pool.query(usersColumnsQuery);
    console.log('\n👤 USER LOCATION COLUMNS:');
    if (usersColumnsResult.rows.length > 0) {
      usersColumnsResult.rows.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('   No direct location columns found in users table');
    }
    
    // Sample users to see actual data structure
    const sampleUsersQuery = `
      SELECT user_id, username, address_id, role_id
      FROM users 
      WHERE role_id IS NOT NULL
      LIMIT 5
    `;
    
    const sampleUsersResult = await pool.query(sampleUsersQuery);
    console.log('\n📋 SAMPLE USERS:');
    sampleUsersResult.rows.forEach(user => {
      console.log(`   ID: ${user.user_id}, Username: ${user.username}, Address ID: ${user.address_id}, Role ID: ${user.role_id}`);
    });
    
    // Check if addresses table exists and its structure
    const addressTableCheck = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'addresses'
      ORDER BY ordinal_position
    `;
    
    const addressResult = await pool.query(addressTableCheck);
    if (addressResult.rows.length > 0) {
      console.log('\n🏠 ADDRESSES TABLE STRUCTURE:');
      addressResult.rows.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type})`);
      });
      
      // Sample addresses
      const sampleAddresses = await pool.query('SELECT * FROM addresses LIMIT 5');
      console.log('\n📋 SAMPLE ADDRESSES:');
      sampleAddresses.rows.forEach(addr => {
        console.log(`   ID: ${addr.address_id}, Details:`, JSON.stringify(addr, null, 2));
      });
    }
    
    // Try to find how users connect to barangays
    console.log('\n🔍 TESTING USER-BARANGAY CONNECTION METHODS:');
    
    // Method 1: Direct join through addresses
    try {
      const directJoinQuery = `
        SELECT u.user_id, u.username, a.barangay_id, b.barangay_name
        FROM users u
        LEFT JOIN addresses a ON u.address_id = a.address_id
        LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
        WHERE u.user_id IS NOT NULL
        LIMIT 5
      `;
      const directResult = await pool.query(directJoinQuery);
      console.log('✅ Method 1 (users -> addresses -> barangays):');
      directResult.rows.forEach(row => {
        console.log(`   User: ${row.username}, Barangay: ${row.barangay_name || 'None'}`);
      });
    } catch (error) {
      console.log('❌ Method 1 failed:', error.message);
    }
    
    // Method 2: Check for any other connection patterns
    try {
      // Look for any foreign key relationships
      const fkQuery = `
        SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name = 'users' OR ccu.table_name = 'barangays')
      `;
      
      const fkResult = await pool.query(fkQuery);
      console.log('\n🔗 FOREIGN KEY RELATIONSHIPS:');
      fkResult.rows.forEach(fk => {
        console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } catch (error) {
      console.log('❌ Foreign key check failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserBarangayRelation();
