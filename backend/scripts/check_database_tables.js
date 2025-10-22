const pool = require('../config/db');

async function checkDatabaseTables() {
  console.log('🔍 Checking database tables in Neon...\n');
  
  try {
    // Check if user_locations table exists
    console.log('📍 Checking user_locations table...');
    const userLocationsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_locations'
      );
    `);
    
    if (userLocationsCheck.rows[0].exists) {
      console.log('✅ user_locations table EXISTS');
      
      // Check structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'user_locations' 
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 user_locations table structure:');
      structure.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Check data count
      const count = await pool.query('SELECT COUNT(*) FROM user_locations');
      console.log(`📊 Records in user_locations: ${count.rows[0].count}\n`);
    } else {
      console.log('❌ user_locations table DOES NOT EXIST\n');
    }

    // Check if chat tables exist
    console.log('💬 Checking chat system tables...');
    
    const chatTablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('special_pickup_chats', 'special_pickup_chat_messages')
      ORDER BY table_name;
    `);
    
    if (chatTablesCheck.rows.length > 0) {
      console.log('✅ Chat tables found:');
      chatTablesCheck.rows.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
      
      // Check chat data
      for (const table of chatTablesCheck.rows) {
        const count = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
        console.log(`📊 Records in ${table.table_name}: ${count.rows[0].count}`);
      }
    } else {
      console.log('❌ Chat tables DO NOT EXIST');
    }
    
    console.log('\n💬 Checking if special_pickup_requests has location columns...');
    const specialPickupColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'special_pickup_requests' 
      AND column_name IN ('pickup_latitude', 'pickup_longitude', 'final_price', 'price_status')
      ORDER BY column_name;
    `);
    
    if (specialPickupColumns.rows.length > 0) {
      console.log('✅ Special pickup location/price columns found:');
      specialPickupColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Special pickup location/price columns MISSING');
    }

    // Check users table for location-related data
    console.log('\n👥 Checking users with addresses...');
    const usersWithAddresses = await pool.query(`
      SELECT COUNT(*) as total_users,
             COUNT(a.address_id) as users_with_addresses,
             COUNT(b.barangay_id) as users_with_barangays
      FROM users u
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.role_id = 3 AND u.approval_status = 'approved';
    `);
    
    const stats = usersWithAddresses.rows[0];
    console.log(`📊 User location stats:`);
    console.log(`   - Total approved residents: ${stats.total_users}`);
    console.log(`   - Users with addresses: ${stats.users_with_addresses}`);
    console.log(`   - Users with barangays: ${stats.users_with_barangays}`);

    // List all relevant tables
    console.log('\n📋 All relevant tables in database:');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (
        table_name LIKE '%location%' OR 
        table_name LIKE '%chat%' OR 
        table_name LIKE '%pickup%' OR
        table_name IN ('users', 'addresses', 'barangays', 'user_names')
      )
      ORDER BY table_name;
    `);
    
    allTables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error checking database:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the check
checkDatabaseTables().then(() => {
  console.log('\n✅ Database check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
