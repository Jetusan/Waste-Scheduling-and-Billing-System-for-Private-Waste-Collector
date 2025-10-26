const { Pool } = require('pg');

// Use the Neon database credentials from the existing script
const pool = new Pool({
  host: 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkNeonTables() {
  try {
    console.log('🔍 Connecting to Neon database...');
    console.log('📡 Host: ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech');
    console.log('🗄️ Database: neondb');
    
    // Set search path for Neon compatibility
    await pool.query('SET search_path TO public');
    
    // Get all tables in the database
    console.log('\n📊 ALL TABLES IN DATABASE:');
    const allTables = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`Found ${allTables.rows.length} tables:`);
    allTables.rows.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name} (${table.table_type})`);
    });
    
    // Check specifically for subdivision-related tables
    console.log('\n🏘️ SUBDIVISION-RELATED TABLES:');
    const subdivisionTables = allTables.rows.filter(table => 
      table.table_name.toLowerCase().includes('subdivision') ||
      table.table_name.toLowerCase().includes('barangay') ||
      table.table_name.toLowerCase().includes('address')
    );
    
    if (subdivisionTables.length > 0) {
      subdivisionTables.forEach(table => {
        console.log(`  ✅ ${table.table_name}`);
      });
    } else {
      console.log('  ❌ No subdivision-related tables found');
    }
    
    // Check if subdivisions table exists specifically
    const subdivisionsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subdivisions'
      ) as exists
    `);
    
    console.log(`\n🔍 SUBDIVISIONS TABLE EXISTS: ${subdivisionsExists.rows[0].exists ? '✅ YES' : '❌ NO'}`);
    
    // Check barangays table
    const barangaysExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'barangays'
      ) as exists
    `);
    
    console.log(`🔍 BARANGAYS TABLE EXISTS: ${barangaysExists.rows[0].exists ? '✅ YES' : '❌ NO'}`);
    
    if (barangaysExists.rows[0].exists) {
      // Check barangays table structure
      const barangaysColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'barangays'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 BARANGAYS TABLE STRUCTURE:');
      barangaysColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if San Isidro exists
      const sanIsidroCheck = await pool.query(`
        SELECT barangay_id, barangay_name 
        FROM barangays 
        WHERE barangay_name = 'San Isidro'
      `);
      
      console.log(`\n🏘️ SAN ISIDRO BARANGAY: ${sanIsidroCheck.rows.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      if (sanIsidroCheck.rows.length > 0) {
        console.log(`   ID: ${sanIsidroCheck.rows[0].barangay_id}, Name: ${sanIsidroCheck.rows[0].barangay_name}`);
      }
    }
    
    // Check addresses table
    const addressesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'addresses'
      ) as exists
    `);
    
    console.log(`🔍 ADDRESSES TABLE EXISTS: ${addressesExists.rows[0].exists ? '✅ YES' : '❌ NO'}`);
    
    if (addressesExists.rows[0].exists) {
      const addressesColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'addresses'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 ADDRESSES TABLE STRUCTURE:');
      addressesColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Check collection_schedules table
    const collectionSchedulesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'collection_schedules'
      ) as exists
    `);
    
    console.log(`🔍 COLLECTION_SCHEDULES TABLE EXISTS: ${collectionSchedulesExists.rows[0].exists ? '✅ YES' : '❌ NO'}`);
    
    if (collectionSchedulesExists.rows[0].exists) {
      const scheduleColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'collection_schedules'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 COLLECTION_SCHEDULES TABLE STRUCTURE:');
      scheduleColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      const hasSubdivisionColumn = scheduleColumns.rows.some(col => col.column_name === 'subdivision');
      console.log(`\n🔍 COLLECTION_SCHEDULES HAS SUBDIVISION COLUMN: ${hasSubdivisionColumn ? '✅ YES' : '❌ NO'}`);
    }
    
    // Summary and recommendations
    console.log('\n📝 SUMMARY AND RECOMMENDATIONS:');
    
    if (!subdivisionsExists.rows[0].exists) {
      console.log('❌ SUBDIVISIONS table is missing - this is why your script failed');
      console.log('💡 SOLUTION: You need to create the subdivisions table first');
      console.log('   Run the init.sql script or create the table manually');
    }
    
    if (barangaysExists.rows[0].exists) {
      console.log('✅ BARANGAYS table exists - good foundation');
    }
    
    if (addressesExists.rows[0].exists) {
      console.log('✅ ADDRESSES table exists - can link to subdivisions');
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkNeonTables();
