const pool = require('./config/dbAdmin');

async function addSubdivisionColumn() {
  console.log('🔧 Adding subdivision column to collector_barangay_assignments...\n');
  
  try {
    // Check if column already exists
    const columnCheck = await pool.queryWithRetry(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'collector_barangay_assignments' 
      AND column_name = 'subdivision'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Subdivision column already exists');
    } else {
      console.log('📝 Adding subdivision column...');
      await pool.queryWithRetry(`
        ALTER TABLE collector_barangay_assignments 
        ADD COLUMN subdivision VARCHAR(255)
      `);
      console.log('✅ Subdivision column added successfully');
    }
    
    // Verify the table structure
    console.log('\n📋 Updated table structure:');
    const tableStructure = await pool.queryWithRetry(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'collector_barangay_assignments' 
      ORDER BY ordinal_position
    `);
    
    tableStructure.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Test insert with subdivision
    console.log('\n🧪 Testing insert with subdivision...');
    const testResult = await pool.queryWithRetry(`
      INSERT INTO collector_barangay_assignments 
      (collector_id, barangay_id, subdivision, created_by) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [6, 1, 'vsm-heights-phase1', 1]);
    
    console.log('✅ Test assignment created:', testResult.rows[0]);
    
    // Clean up
    await pool.queryWithRetry(
      'DELETE FROM collector_barangay_assignments WHERE assignment_id = $1',
      [testResult.rows[0].assignment_id]
    );
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run migration
addSubdivisionColumn();
