const pool = require('./config/dbAdmin');

async function testAssignmentsEndpoint() {
  console.log('🧪 Testing Assignments Database Operations...\n');
  
  try {
    // Test 1: Check if collectors exist
    console.log('1. Checking collectors...');
    const collectorsResult = await pool.queryWithRetry('SELECT collector_id, user_id FROM collectors LIMIT 5');
    console.log(`✅ Found ${collectorsResult.rows.length} collectors:`);
    collectorsResult.rows.forEach(c => {
      console.log(`   Collector ID: ${c.collector_id}, User ID: ${c.user_id}`);
    });
    
    // Test 2: Check if barangays exist
    console.log('\n2. Checking barangays...');
    const barangaysResult = await pool.queryWithRetry('SELECT barangay_id, barangay_name FROM barangays LIMIT 5');
    console.log(`✅ Found ${barangaysResult.rows.length} barangays:`);
    barangaysResult.rows.forEach(b => {
      console.log(`   Barangay ID: ${b.barangay_id}, Name: ${b.barangay_name}`);
    });
    
    // Test 3: Check if collector_barangay_assignments table exists
    console.log('\n3. Checking collector_barangay_assignments table...');
    try {
      const tableCheck = await pool.queryWithRetry(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'collector_barangay_assignments' 
        ORDER BY ordinal_position
      `);
      
      if (tableCheck.rows.length > 0) {
        console.log('✅ Table exists with columns:');
        tableCheck.rows.forEach(col => {
          console.log(`   ${col.column_name}: ${col.data_type}`);
        });
      } else {
        console.log('❌ Table does not exist yet');
      }
    } catch (error) {
      console.log('❌ Error checking table:', error.message);
    }
    
    // Test 4: Try to create the table (simulating the endpoint)
    console.log('\n4. Creating/updating table structure...');
    try {
      await pool.queryWithRetry(`
        CREATE TABLE IF NOT EXISTS collector_barangay_assignments (
          assignment_id SERIAL PRIMARY KEY,
          collector_id INTEGER NOT NULL,
          barangay_id INTEGER NOT NULL,
          subdivision VARCHAR(255),
          effective_start_date DATE,
          effective_end_date DATE,
          shift_label VARCHAR(100),
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table created/verified successfully');
    } catch (error) {
      console.log('❌ Error creating table:', error.message);
    }
    
    // Test 5: Try to insert a test assignment
    if (collectorsResult.rows.length > 0 && barangaysResult.rows.length > 0) {
      console.log('\n5. Testing assignment creation...');
      try {
        const testCollectorId = collectorsResult.rows[0].collector_id;
        const testBarangayId = 1; // San Isidro should be ID 1
        const testSubdivision = 'vsm-heights-phase1';
        
        const insertResult = await pool.queryWithRetry(`
          INSERT INTO collector_barangay_assignments 
          (collector_id, barangay_id, subdivision, created_by) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `, [testCollectorId, testBarangayId, testSubdivision, 1]);
        
        console.log('✅ Test assignment created:', insertResult.rows[0]);
        
        // Clean up test data
        await pool.queryWithRetry(
          'DELETE FROM collector_barangay_assignments WHERE assignment_id = $1',
          [insertResult.rows[0].assignment_id]
        );
        console.log('✅ Test assignment cleaned up');
        
      } catch (error) {
        console.log('❌ Error creating test assignment:', error.message);
      }
    }
    
    // Test 6: Check existing assignments
    console.log('\n6. Checking existing assignments...');
    try {
      const existingAssignments = await pool.queryWithRetry(`
        SELECT cba.*, b.barangay_name 
        FROM collector_barangay_assignments cba
        LEFT JOIN barangays b ON cba.barangay_id = b.barangay_id
        ORDER BY cba.created_at DESC
        LIMIT 10
      `);
      
      console.log(`✅ Found ${existingAssignments.rows.length} existing assignments:`);
      existingAssignments.rows.forEach(a => {
        console.log(`   Assignment ${a.assignment_id}: Collector ${a.collector_id} -> ${a.barangay_name} (${a.subdivision || 'No subdivision'})`);
      });
    } catch (error) {
      console.log('❌ Error checking existing assignments:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run tests
testAssignmentsEndpoint();
