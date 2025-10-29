const { pool } = require('../config/db');
require('dotenv').config();

async function debugNeonConnectionFixed() {
  try {
    console.log('🔍 Debugging Neon database connection and user_locations table...\n');
    
    // Check environment variables
    console.log('🔗 Environment Variables:');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'Not set'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'Not set'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'Not set'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 'Not set'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
    
    // Test basic connection
    console.log('\n🧪 Testing database connection...');
    const testQuery = await pool.query('SELECT NOW() as current_time, current_database() as db_name, current_user as db_user');
    console.log(`   ✅ Connected to database: ${testQuery.rows[0].db_name}`);
    console.log(`   👤 Connected as user: ${testQuery.rows[0].db_user}`);
    console.log(`   ⏰ Server time: ${testQuery.rows[0].current_time}`);
    
    // Check current schema
    console.log('\n📋 Checking current schema...');
    const schemaQuery = await pool.query('SELECT current_schema()');
    console.log(`   Current schema: ${schemaQuery.rows[0].current_schema}`);
    
    // Set search path to public explicitly
    console.log('\n🔧 Setting search path to public...');
    await pool.query('SET search_path TO public');
    const newSchemaQuery = await pool.query('SELECT current_schema()');
    console.log(`   New current schema: ${newSchemaQuery.rows[0].current_schema}`);
    
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
      console.log('❌ user_locations table does not exist in public schema!');
      
      // Check other schemas
      console.log('\n🔍 Checking for user_locations in other schemas...');
      const otherSchemasQuery = `
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name = 'user_locations'
      `;
      const otherSchemas = await pool.query(otherSchemasQuery);
      if (otherSchemas.rows.length > 0) {
        console.log('   Found user_locations in:');
        otherSchemas.rows.forEach(row => {
          console.log(`   - Schema: ${row.table_schema}`);
        });
      } else {
        console.log('   ❌ user_locations table not found in any schema!');
      }
      return;
    }
    
    // Get exact count from user_locations table
    console.log('\n📊 Getting exact count from user_locations table...');
    const countQuery = 'SELECT COUNT(*) as total_count FROM public.user_locations';
    const countResult = await pool.query(countQuery);
    console.log(`   Total records in user_locations: ${countResult.rows[0].total_count}`);
    
    // Show ALL records with full details
    console.log('\n📍 ALL records in user_locations table:');
    const allRecordsQuery = `
      SELECT location_id, user_id, kind, is_current, 
             latitude, longitude, accuracy_m, source, captured_at
      FROM public.user_locations 
      ORDER BY location_id
    `;
    const allRecords = await pool.query(allRecordsQuery);
    
    console.log(`\n🔢 TOTAL RECORDS FOUND: ${allRecords.rows.length}`);
    console.log('📋 Detailed list:');
    
    if (allRecords.rows.length === 0) {
      console.log('   ❌ NO RECORDS FOUND IN user_locations table!');
    } else {
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
    
    // Check specifically for current home locations
    console.log('\n🏠 CURRENT HOME locations specifically:');
    const homeQuery = `
      SELECT location_id, user_id, latitude, longitude, source, captured_at
      FROM public.user_locations 
      WHERE kind = 'home' AND is_current = true
      ORDER BY location_id
    `;
    const homeResult = await pool.query(homeQuery);
    console.log(`   Found ${homeResult.rows.length} current home locations`);
    
    // Check users table to see how many residents we should have
    console.log('\n👥 Checking users table for residents...');
    const usersQuery = `
      SELECT COUNT(*) as total_residents
      FROM public.users 
      WHERE role_id = 3 AND approval_status = 'approved'
    `;
    const usersResult = await pool.query(usersQuery);
    console.log(`   Total approved residents: ${usersResult.rows[0].total_residents}`);
    
    // Final comparison
    console.log('\n📊 COMPARISON:');
    console.log(`   Approved residents: ${usersResult.rows[0].total_residents}`);
    console.log(`   Total user_locations records: ${allRecords.rows.length}`);
    console.log(`   Current home locations: ${homeResult.rows.length}`);
    
    console.log('\n🎯 WHAT TO CHECK IN NEON CONSOLE:');
    console.log('   1. Run: SELECT COUNT(*) FROM user_locations;');
    console.log(`      Expected: ${allRecords.rows.length}`);
    console.log('   2. Run: SELECT * FROM user_locations ORDER BY location_id;');
    console.log(`      Should show ${allRecords.rows.length} rows`);
    console.log('   3. Make sure you are connected to the correct database!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugNeonConnectionFixed();
