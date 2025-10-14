const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'neondb',
  user: process.env.DB_USER || 'neondb_owner',
  password: process.env.DB_PASSWORD || 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting collection_routes migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix_missing_collection_routes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the tables were created
    const verifyQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('collection_routes', 'route_types', 'schedule_types', 'route_stops')
      ORDER BY table_name;
    `;
    
    const result = await client.query(verifyQuery);
    console.log('📋 Created tables:', result.rows.map(row => row.table_name));
    
    // Check record counts
    const countQuery = `
      SELECT 'collection_routes' as table_name, COUNT(*) as record_count FROM collection_routes
      UNION ALL
      SELECT 'route_types' as table_name, COUNT(*) as record_count FROM route_types
      UNION ALL
      SELECT 'schedule_types' as table_name, COUNT(*) as record_count FROM schedule_types;
    `;
    
    const counts = await client.query(countQuery);
    console.log('📊 Record counts:');
    counts.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.record_count} records`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Collection routes migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
