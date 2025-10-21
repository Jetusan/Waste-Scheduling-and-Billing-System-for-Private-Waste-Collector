/**
 * Check the actual database schema for collector assignments
 */

const pool = require('./config/dbAdmin');

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');
  
  try {
    // Check collectors table
    console.log('📋 Collectors table structure:');
    const collectorsSchema = await pool.queryWithRetry(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'collectors' 
      ORDER BY ordinal_position
    `);
    collectorsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check collector_assignments table
    console.log('\n📋 Collector_assignments table structure:');
    const assignmentsSchema = await pool.queryWithRetry(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'collector_assignments' 
      ORDER BY ordinal_position
    `);
    
    if (assignmentsSchema.rows.length > 0) {
      assignmentsSchema.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    } else {
      console.log('  ❌ Table does not exist!');
    }

    // Check what tables exist related to assignments
    console.log('\n📋 All tables containing "assignment" or "collector":');
    const allTables = await pool.queryWithRetry(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%assignment%' OR table_name LIKE '%collector%')
      ORDER BY table_name
    `);
    allTables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // Check collectors table content
    console.log('\n👥 Current collectors:');
    const collectors = await pool.queryWithRetry('SELECT * FROM collectors LIMIT 5');
    collectors.rows.forEach(c => {
      console.log(`  Collector ID: ${c.collector_id}, User ID: ${c.user_id}`);
    });

    // If collector_assignments doesn't exist, check what assignment system is used
    if (assignmentsSchema.rows.length === 0) {
      console.log('\n🔍 Looking for alternative assignment system...');
      
      // Check if assignments are in collectors table itself
      const collectorsWithBarangay = await pool.queryWithRetry(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'collectors' 
          AND column_name LIKE '%barangay%'
      `);
      
      if (collectorsWithBarangay.rows.length > 0) {
        console.log('📍 Found barangay columns in collectors table:');
        collectorsWithBarangay.rows.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type}`);
        });
      }

      // Check for other assignment tables
      const otherAssignments = await pool.queryWithRetry(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE '%assign%'
        ORDER BY table_name
      `);
      
      if (otherAssignments.rows.length > 0) {
        console.log('\n📋 Other assignment-related tables:');
        otherAssignments.rows.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

// Run the check
checkSchema().then(() => {
  console.log('\n✅ Schema check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Schema check failed:', error);
  process.exit(1);
});
