const { Pool } = require('pg');

// Direct connection to Neon database using your credentials
const neonPool = new Pool({
  host: 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkNeonDirectly() {
  try {
    console.log('🔍 Connecting directly to Neon database...\n');
    
    // Test connection
    console.log('🧪 Testing Neon connection...');
    const testQuery = await neonPool.query('SELECT NOW() as current_time, current_database() as db_name, current_user as db_user');
    console.log(`   ✅ Connected to Neon database: ${testQuery.rows[0].db_name}`);
    console.log(`   👤 Connected as user: ${testQuery.rows[0].db_user}`);
    console.log(`   ⏰ Server time: ${testQuery.rows[0].current_time}`);
    
    // Check if user_locations table exists
    console.log('\n📋 Checking if user_locations table exists in Neon...');
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_locations'
      ) as table_exists
    `;
    const tableExists = await neonPool.query(tableExistsQuery);
    console.log(`   Table exists: ${tableExists.rows[0].table_exists}`);
    
    if (!tableExists.rows[0].table_exists) {
      console.log('❌ user_locations table does not exist in Neon!');
      return;
    }
    
    // Get exact count from Neon user_locations table
    console.log('\n📊 Getting exact count from Neon user_locations table...');
    const countQuery = 'SELECT COUNT(*) as total_count FROM user_locations';
    const countResult = await neonPool.query(countQuery);
    console.log(`   🔢 Total records in Neon user_locations: ${countResult.rows[0].total_count}`);
    
    // Show ALL records in Neon
    console.log('\n📍 ALL records in Neon user_locations table:');
    const allRecordsQuery = `
      SELECT location_id, user_id, kind, is_current, 
             latitude, longitude, accuracy_m, source, captured_at
      FROM user_locations 
      ORDER BY location_id
    `;
    const allRecords = await neonPool.query(allRecordsQuery);
    
    console.log(`\n🔢 TOTAL RECORDS IN NEON: ${allRecords.rows.length}`);
    
    if (allRecords.rows.length === 0) {
      console.log('   ❌ NO RECORDS FOUND IN Neon user_locations table!');
    } else {
      console.log('📋 Detailed list from Neon:');
      allRecords.rows.forEach((record, index) => {
        console.log(`\n   ${index + 1}. Location ID: ${record.location_id}`);
        console.log(`      User ID: ${record.user_id}`);
        console.log(`      Kind: ${record.kind}`);
        console.log(`      Is Current: ${record.is_current}`);
        console.log(`      Coordinates: ${record.latitude}, ${record.longitude}`);
        console.log(`      Source: ${record.source}`);
        console.log(`      Date: ${new Date(record.captured_at).toLocaleString()}`);
      });
    }
    
    // Check current home locations specifically
    console.log('\n🏠 CURRENT HOME locations in Neon:');
    const homeQuery = `
      SELECT location_id, user_id, latitude, longitude, source, captured_at
      FROM user_locations 
      WHERE kind = 'home' AND is_current = true
      ORDER BY location_id
    `;
    const homeResult = await neonPool.query(homeQuery);
    console.log(`   Found ${homeResult.rows.length} current home locations in Neon`);
    
    // Check users table in Neon
    console.log('\n👥 Checking users table in Neon for residents...');
    const usersQuery = `
      SELECT COUNT(*) as total_residents
      FROM users 
      WHERE role_id = 3 AND approval_status = 'approved'
    `;
    const usersResult = await neonPool.query(usersQuery);
    console.log(`   Total approved residents in Neon: ${usersResult.rows[0].total_residents}`);
    
    // Show which residents are missing locations in Neon
    console.log('\n❌ Approved residents MISSING locations in Neon:');
    const missingQuery = `
      SELECT u.user_id, u.username,
             CONCAT(n.first_name, ' ', COALESCE(n.middle_name, ''), ' ', n.last_name) as full_name
      FROM users u
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN user_locations ul ON u.user_id = ul.user_id AND ul.kind = 'home' AND ul.is_current = true
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND ul.user_id IS NULL
      ORDER BY u.user_id
    `;
    const missingResult = await neonPool.query(missingQuery);
    
    if (missingResult.rows.length > 0) {
      console.log(`   Found ${missingResult.rows.length} approved residents missing locations in Neon:`);
      missingResult.rows.forEach((resident, index) => {
        console.log(`   ${index + 1}. ❌ ${resident.username} (${resident.full_name || 'N/A'}) - User ID: ${resident.user_id}`);
      });
    } else {
      console.log('   ✅ All approved residents have locations in Neon!');
    }
    
    // Final comparison
    console.log('\n📊 NEON DATABASE SUMMARY:');
    console.log(`   👥 Total approved residents: ${usersResult.rows[0].total_residents}`);
    console.log(`   📍 Total user_locations records: ${allRecords.rows.length}`);
    console.log(`   🏠 Current home locations: ${homeResult.rows.length}`);
    console.log(`   ❌ Missing locations: ${missingResult.rows.length}`);
    
    if (homeResult.rows.length === parseInt(usersResult.rows[0].total_residents)) {
      console.log('\n🎉 PERFECT! All approved residents have locations in Neon!');
    } else {
      console.log(`\n⚠️ ${parseInt(usersResult.rows[0].total_residents) - homeResult.rows.length} approved residents are missing locations in Neon!`);
      console.log('🔧 You need to add locations for the missing residents.');
    }
    
  } catch (error) {
    console.error('❌ Error connecting to Neon:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await neonPool.end();
    process.exit(0);
  }
}

checkNeonDirectly();
