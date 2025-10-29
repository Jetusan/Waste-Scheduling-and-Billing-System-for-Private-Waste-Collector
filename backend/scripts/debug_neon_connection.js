const pool = require('../config/db');

async function debugNeonConnection() {
  try {
    console.log('🔍 Debugging Neon database connection and user_locations table...\n');
    
    // Check database connection details
    console.log('🔗 Database Connection Details:');
    console.log(`   Host: ${pool.options.host || 'Not specified'}`);
    console.log(`   Database: ${pool.options.database || 'Not specified'}`);
    console.log(`   User: ${pool.options.user || 'Not specified'}`);
    console.log(`   Port: ${pool.options.port || 'Not specified'}`);
    
    // Test basic connection
    console.log('\n🧪 Testing database connection...');
    const testQuery = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`   ✅ Connected to database: ${testQuery.rows[0].db_name}`);
    console.log(`   ⏰ Server time: ${testQuery.rows[0].current_time}`);
    
    // Check if user_locations table exists
    console.log('\n📋 Checking if user_locations table exists...');
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_locations'
      ) as table_exists
    `;
    const tableExists = await pool.query(tableExistsQuery);
    console.log(`   Table exists: ${tableExists.rows[0].table_exists}`);
    
    if (!tableExists.rows[0].table_exists) {
      console.log('❌ user_locations table does not exist!');
      return;
    }
    
    // Get exact count from user_locations table
    console.log('\n📊 Getting exact count from user_locations table...');
    const countQuery = 'SELECT COUNT(*) as total_count FROM user_locations';
    const countResult = await pool.query(countQuery);
    console.log(`   Total records in user_locations: ${countResult.rows[0].total_count}`);
    
    // Get count by kind
    console.log('\n📊 Count by location kind...');
    const kindCountQuery = `
      SELECT kind, COUNT(*) as count 
      FROM user_locations 
      GROUP BY kind 
      ORDER BY count DESC
    `;
    const kindResult = await pool.query(kindCountQuery);
    kindResult.rows.forEach(row => {
      console.log(`   ${row.kind}: ${row.count} records`);
    });
    
    // Get count by is_current
    console.log('\n📊 Count by is_current status...');
    const currentCountQuery = `
      SELECT is_current, COUNT(*) as count 
      FROM user_locations 
      GROUP BY is_current 
      ORDER BY is_current DESC
    `;
    const currentResult = await pool.query(currentCountQuery);
    currentResult.rows.forEach(row => {
      console.log(`   is_current = ${row.is_current}: ${row.count} records`);
    });
    
    // Show ALL records with minimal info
    console.log('\n📍 ALL records in user_locations (minimal view):');
    const allRecordsQuery = `
      SELECT location_id, user_id, kind, is_current, 
             ROUND(latitude::numeric, 6) as lat, 
             ROUND(longitude::numeric, 6) as lng,
             source, captured_at
      FROM user_locations 
      ORDER BY location_id
    `;
    const allRecords = await pool.query(allRecordsQuery);
    
    console.log(`Found ${allRecords.rows.length} total records:`);
    allRecords.rows.forEach((record, index) => {
      console.log(`   ${index + 1}. ID:${record.location_id} | User:${record.user_id} | ${record.kind} | Current:${record.is_current} | ${record.lat},${record.lng} | ${record.source}`);
    });
    
    // Check specifically for home locations that are current
    console.log('\n🏠 Current HOME locations only:');
    const homeCurrentQuery = `
      SELECT location_id, user_id, latitude, longitude, source, captured_at
      FROM user_locations 
      WHERE kind = 'home' AND is_current = true
      ORDER BY location_id
    `;
    const homeCurrentResult = await pool.query(homeCurrentQuery);
    
    console.log(`Found ${homeCurrentResult.rows.length} current home locations:`);
    homeCurrentResult.rows.forEach((record, index) => {
      console.log(`   ${index + 1}. Location ID: ${record.location_id}, User ID: ${record.user_id}`);
      console.log(`      Coordinates: ${record.latitude}, ${record.longitude}`);
      console.log(`      Source: ${record.source}, Date: ${new Date(record.captured_at).toLocaleString()}`);
      console.log('');
    });
    
    // Check for any transactions or locks
    console.log('\n🔒 Checking for active transactions...');
    const transactionQuery = `
      SELECT pid, state, query_start, query 
      FROM pg_stat_activity 
      WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
    `;
    const transactionResult = await pool.query(transactionQuery);
    if (transactionResult.rows.length > 0) {
      console.log(`   Found ${transactionResult.rows.length} active queries/transactions:`);
      transactionResult.rows.forEach(tx => {
        console.log(`   - PID: ${tx.pid}, State: ${tx.state}`);
        console.log(`     Query: ${tx.query.substring(0, 100)}...`);
      });
    } else {
      console.log('   ✅ No active transactions found');
    }
    
    // Final verification - what you should see in Neon console
    console.log('\n🎯 WHAT YOU SHOULD SEE IN NEON CONSOLE:');
    console.log('   Run this query in Neon console:');
    console.log('   SELECT COUNT(*) FROM user_locations;');
    console.log(`   Expected result: ${allRecords.rows.length}`);
    console.log('');
    console.log('   Or run this for current home locations:');
    console.log("   SELECT * FROM user_locations WHERE kind = 'home' AND is_current = true ORDER BY location_id;");
    console.log(`   Expected result: ${homeCurrentResult.rows.length} rows`);
    
    // Check if there are multiple databases or schemas
    console.log('\n🗄️ Checking for multiple schemas...');
    const schemaQuery = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `;
    const schemaResult = await pool.query(schemaQuery);
    console.log('   Available schemas:');
    schemaResult.rows.forEach(schema => {
      console.log(`   - ${schema.schema_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugNeonConnection();
