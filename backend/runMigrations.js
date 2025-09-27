const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Read and execute collector_issues migration
    const migration1Path = path.join(__dirname, 'routes/migrations/20250915_add_collector_issues.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
    
    console.log('📊 Running collector_issues migration...');
    await pool.query(migration1SQL);
    console.log('✅ collector_issues migration completed');
    
    // Read and execute next_collections migration
    const migration2Path = path.join(__dirname, 'routes/migrations/20250915_add_next_collections_tracking.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
    
    console.log('📊 Running next_collections migration...');
    await pool.query(migration2SQL);
    console.log('✅ next_collections migration completed');
    
    console.log('🎉 All migrations completed successfully!');
    
    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('collector_issues', 'resident_next_collections')
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:', result.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

runMigrations();
