const { pool } = require('../config/db');

async function addGateImageColumn() {
  console.log('🔄 Adding gate_image_url column to user_locations table...\n');
  
  try {
    // Add the gate_image_url column
    await pool.query(`
      ALTER TABLE user_locations 
      ADD COLUMN IF NOT EXISTS gate_image_url VARCHAR(500) NULL
    `);
    
    console.log('✅ Successfully added gate_image_url column');
    
    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_locations_user_kind 
      ON user_locations(user_id, kind) 
      WHERE is_current = true
    `);
    
    console.log('✅ Created performance index');
    
    // Display the updated table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_locations' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated user_locations table structure:');
    structure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addGateImageColumn().catch(console.error);
