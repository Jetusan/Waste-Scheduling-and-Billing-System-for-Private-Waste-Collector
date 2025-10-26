const { Pool } = require('pg');

// Use the Neon database credentials
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

async function fixCollectorAssignments() {
  try {
    console.log('🔧 Fixing collector assignments for collector_1...');
    
    // Set search path for Neon compatibility
    await pool.query('SET search_path TO public');
    
    console.log('\n📋 CURRENT SITUATION:');
    console.log('- user_id 281 (collector_1) has TWO collector records:');
    console.log('  - collector_id 34: No assignments');
    console.log('  - collector_id 35: Has assignment to San Isidro');
    console.log('- API is using collector_id 34 (wrong one)');
    console.log('- Assignment exists on collector_id 35 (correct one)');
    
    console.log('\n🎯 SOLUTION OPTIONS:');
    console.log('Option 1: Copy assignment from collector_id 35 to collector_id 34');
    console.log('Option 2: Update API to use the latest collector_id (35)');
    console.log('Option 3: Consolidate to single collector record');
    
    console.log('\n✅ IMPLEMENTING SOLUTION: Copy assignment to collector_id 34');
    
    // Check current assignment on collector_id 35
    const currentAssignment = await pool.query(`
      SELECT *
      FROM collector_barangay_assignments
      WHERE collector_id = 35 AND barangay_id = 6
    `);
    
    if (currentAssignment.rows.length > 0) {
      const assignment = currentAssignment.rows[0];
      console.log('📋 Found assignment on collector_id 35:', assignment);
      
      // Check if assignment already exists on collector_id 34
      const existingAssignment = await pool.query(`
        SELECT assignment_id
        FROM collector_barangay_assignments
        WHERE collector_id = 34 AND barangay_id = 6
      `);
      
      if (existingAssignment.rows.length === 0) {
        console.log('💡 Creating assignment for collector_id 34...');
        
        try {
          const createAssignment = await pool.query(`
            INSERT INTO collector_barangay_assignments (
              collector_id, 
              barangay_id, 
              effective_start_date,
              effective_end_date,
              shift_label,
              created_by,
              created_at,
              subdivision
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
            RETURNING assignment_id, collector_id, barangay_id, subdivision
          `, [
            34, // collector_id
            assignment.barangay_id, // barangay_id (6 = San Isidro)
            assignment.effective_start_date,
            assignment.effective_end_date,
            assignment.shift_label,
            assignment.created_by,
            assignment.subdivision // 'vsm-heights-phase1'
          ]);
          
          console.log('✅ Assignment created for collector_id 34:', createAssignment.rows[0]);
        } catch (error) {
          console.log('❌ Error creating assignment:', error.message);
        }
      } else {
        console.log('ℹ️ Assignment already exists for collector_id 34');
      }
    } else {
      console.log('❌ No assignment found on collector_id 35');
    }
    
    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    
    // Check assignments for both collector IDs
    const allAssignments = await pool.query(`
      SELECT 
        cba.assignment_id,
        cba.collector_id,
        cba.barangay_id,
        cba.subdivision,
        b.barangay_name,
        c.user_id
      FROM collector_barangay_assignments cba
      JOIN barangays b ON cba.barangay_id = b.barangay_id
      JOIN collectors c ON cba.collector_id = c.collector_id
      WHERE c.user_id = 281
      ORDER BY cba.collector_id
    `);
    
    console.log(`📊 All assignments for user_id 281:`);
    allAssignments.rows.forEach(assignment => {
      console.log(`   - collector_id ${assignment.collector_id} → ${assignment.barangay_name} (${assignment.subdivision || 'no subdivision'})`);
    });
    
    // Test the API endpoint that was failing
    console.log('\n🧪 TESTING API LOGIC:');
    
    // Simulate the API logic for collector_id 34
    const apiTest = await pool.query(`
      SELECT 
        cba.assignment_id,
        cba.collector_id,
        cba.barangay_id,
        b.barangay_name,
        cba.subdivision
      FROM collector_barangay_assignments cba
      JOIN barangays b ON cba.barangay_id = b.barangay_id
      WHERE cba.collector_id = 34
    `);
    
    console.log(`🔍 API test for collector_id 34: Found ${apiTest.rows.length} assignments`);
    if (apiTest.rows.length > 0) {
      apiTest.rows.forEach(assignment => {
        console.log(`   ✅ ${assignment.barangay_name} (assignment_id: ${assignment.assignment_id})`);
      });
      console.log('\n🎉 SUCCESS! The mobile app should now work!');
      console.log('📱 collector_1 can now see San Isidro barangay assignment');
    } else {
      console.log('❌ Still no assignments found for collector_id 34');
    }
    
  } catch (error) {
    console.error('❌ Fix error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

fixCollectorAssignments();
