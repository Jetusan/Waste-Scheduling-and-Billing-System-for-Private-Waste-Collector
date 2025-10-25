const pool = require('./config/dbAdmin');

async function testCompleteAssignment() {
  console.log('🧪 Testing Complete Assignment Functionality...\n');
  
  try {
    // Get a collector
    const collectorsResult = await pool.queryWithRetry('SELECT collector_id FROM collectors LIMIT 1');
    if (collectorsResult.rows.length === 0) {
      console.log('❌ No collectors found');
      return;
    }
    
    const collectorId = collectorsResult.rows[0].collector_id;
    const barangayId = 6; // San Isidro
    const subdivision = 'vsm-heights-phase1';
    
    console.log(`📝 Testing assignment creation:`);
    console.log(`   Collector ID: ${collectorId}`);
    console.log(`   Barangay ID: ${barangayId} (San Isidro)`);
    console.log(`   Subdivision: ${subdivision}`);
    
    // Test 1: Create assignment
    console.log('\n1. Creating assignment...');
    const createResult = await pool.queryWithRetry(`
      INSERT INTO collector_barangay_assignments 
      (collector_id, barangay_id, subdivision) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [collectorId, barangayId, subdivision]);
    
    console.log('✅ Assignment created:', createResult.rows[0]);
    const assignmentId = createResult.rows[0].assignment_id;
    
    // Test 2: Query assignment with barangay name
    console.log('\n2. Querying assignment with barangay info...');
    const queryResult = await pool.queryWithRetry(`
      SELECT cba.assignment_id, cba.collector_id, cba.barangay_id, cba.subdivision,
             cba.effective_start_date, cba.effective_end_date, cba.shift_label,
             cba.created_by, cba.created_at, cba.updated_by, cba.updated_at,
             b.barangay_name,
             'barangay' as assignment_type
      FROM collector_barangay_assignments cba
      LEFT JOIN barangays b ON b.barangay_id = cba.barangay_id
      WHERE cba.assignment_id = $1
    `, [assignmentId]);
    
    console.log('✅ Assignment query result:', queryResult.rows[0]);
    
    // Test 3: List all assignments for this collector
    console.log('\n3. Listing all assignments for collector...');
    const listResult = await pool.queryWithRetry(`
      SELECT cba.assignment_id, cba.collector_id, cba.barangay_id, cba.subdivision,
             cba.effective_start_date, cba.effective_end_date, cba.shift_label,
             cba.created_by, cba.created_at, cba.updated_by, cba.updated_at,
             b.barangay_name,
             'barangay' as assignment_type
      FROM collector_barangay_assignments cba
      LEFT JOIN barangays b ON b.barangay_id = cba.barangay_id
      WHERE cba.collector_id = $1
      ORDER BY cba.created_at DESC
    `, [collectorId]);
    
    console.log(`✅ Found ${listResult.rows.length} assignments for collector ${collectorId}:`);
    listResult.rows.forEach(a => {
      console.log(`   Assignment ${a.assignment_id}: ${a.barangay_name} - ${a.subdivision || 'No subdivision'}`);
    });
    
    // Test 4: Clean up
    console.log('\n4. Cleaning up test data...');
    await pool.queryWithRetry(
      'DELETE FROM collector_barangay_assignments WHERE assignment_id = $1',
      [assignmentId]
    );
    console.log('✅ Test assignment deleted');
    
    console.log('\n🎉 All tests passed! The assignment endpoint should work correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run test
testCompleteAssignment();
