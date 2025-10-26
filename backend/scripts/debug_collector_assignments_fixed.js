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

async function debugCollectorAssignments() {
  try {
    console.log('🔍 Debugging collector assignments for collector_1...');
    
    // Set search path for Neon compatibility
    await pool.query('SET search_path TO public');
    
    // 1. Check if collector_1 exists
    console.log('\n1️⃣ CHECKING COLLECTOR_1 USER:');
    const userCheck = await pool.query(`
      SELECT user_id, username, role_id, approval_status
      FROM users 
      WHERE username = 'collector_1' OR user_id = 281
    `);
    
    if (userCheck.rows.length > 0) {
      console.log('✅ collector_1 found:', userCheck.rows[0]);
    } else {
      console.log('❌ collector_1 not found in users table');
      return;
    }
    
    // 2. Check collectors table structure first
    console.log('\n2️⃣ CHECKING COLLECTORS TABLE STRUCTURE:');
    const collectorsStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'collectors' 
      ORDER BY ordinal_position
    `);
    
    console.log('Collectors table columns:');
    collectorsStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // 3. Check collectors table with correct columns
    console.log('\n3️⃣ CHECKING COLLECTORS TABLE:');
    const collectorsCheck = await pool.query(`
      SELECT *
      FROM collectors 
      WHERE user_id = 281
    `);
    
    if (collectorsCheck.rows.length > 0) {
      console.log('✅ Collector records found:');
      collectorsCheck.rows.forEach(collector => {
        console.log('   Collector record:', collector);
      });
    } else {
      console.log('❌ No collector records found for user_id 281');
      
      // Check if any collectors exist at all
      const allCollectors = await pool.query(`SELECT COUNT(*) as total FROM collectors`);
      console.log(`   Total collectors in database: ${allCollectors.rows[0].total}`);
    }
    
    // 4. Check collector_barangay_assignments table structure
    console.log('\n4️⃣ CHECKING COLLECTOR_BARANGAY_ASSIGNMENTS TABLE:');
    const assignmentsStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'collector_barangay_assignments' 
      ORDER BY ordinal_position
    `);
    
    if (assignmentsStructure.rows.length > 0) {
      console.log('collector_barangay_assignments table columns:');
      assignmentsStructure.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ collector_barangay_assignments table does not exist');
    }
    
    // 5. Check collector_barangay_assignments table
    console.log('\n5️⃣ CHECKING COLLECTOR_BARANGAY_ASSIGNMENTS DATA:');
    const assignmentsCheck = await pool.query(`
      SELECT *
      FROM collector_barangay_assignments
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (assignmentsCheck.rows.length > 0) {
      console.log('✅ Barangay assignments found (last 10):');
      assignmentsCheck.rows.forEach((assignment, index) => {
        console.log(`   ${index + 1}. Assignment:`, assignment);
      });
    } else {
      console.log('❌ No barangay assignments found in the table');
    }
    
    // 6. Check if San Isidro barangay exists
    console.log('\n6️⃣ CHECKING SAN ISIDRO BARANGAY:');
    const sanIsidroCheck = await pool.query(`
      SELECT barangay_id, barangay_name
      FROM barangays 
      WHERE barangay_name = 'San Isidro'
    `);
    
    if (sanIsidroCheck.rows.length > 0) {
      console.log('✅ San Isidro barangay found:', sanIsidroCheck.rows[0]);
    } else {
      console.log('❌ San Isidro barangay not found');
    }
    
    // 7. Check what assignments exist for collector_id 34
    console.log('\n7️⃣ CHECKING ASSIGNMENTS FOR COLLECTOR_ID 34:');
    const collector34Assignments = await pool.query(`
      SELECT *
      FROM collector_barangay_assignments
      WHERE collector_id = 34
    `);
    
    if (collector34Assignments.rows.length > 0) {
      console.log('✅ Found assignments for collector_id 34:');
      collector34Assignments.rows.forEach(assignment => {
        console.log('   Assignment:', assignment);
      });
    } else {
      console.log('❌ No assignments found for collector_id 34');
      
      // Check if collector_id 34 exists in collectors table
      const collector34Check = await pool.query(`
        SELECT * FROM collectors WHERE collector_id = 34
      `);
      
      if (collector34Check.rows.length > 0) {
        console.log('✅ collector_id 34 exists in collectors table:', collector34Check.rows[0]);
      } else {
        console.log('❌ collector_id 34 does not exist in collectors table');
      }
    }
    
    // 8. SOLUTION: Create missing collector and assignment
    console.log('\n8️⃣ CREATING MISSING DATA IF NEEDED:');
    
    // First, check if we need to create a collector record
    const collectorExists = await pool.query(`
      SELECT collector_id FROM collectors WHERE user_id = 281
    `);
    
    let collectorId;
    
    if (collectorExists.rows.length === 0) {
      console.log('💡 Creating missing collector record for user_id 281...');
      try {
        const createCollector = await pool.query(`
          INSERT INTO collectors (user_id, status, created_at)
          VALUES (281, 'active', CURRENT_TIMESTAMP)
          RETURNING collector_id, user_id, status
        `);
        
        collectorId = createCollector.rows[0].collector_id;
        console.log('✅ Collector created:', createCollector.rows[0]);
      } catch (error) {
        console.log('❌ Error creating collector:', error.message);
        return;
      }
    } else {
      collectorId = collectorExists.rows[0].collector_id;
      console.log(`✅ Collector already exists with collector_id: ${collectorId}`);
    }
    
    // Now check if we need to create the barangay assignment
    const assignmentExists = await pool.query(`
      SELECT assignment_id 
      FROM collector_barangay_assignments 
      WHERE collector_id = $1 AND barangay_id = 6 AND status = 'active'
    `, [collectorId]);
    
    if (assignmentExists.rows.length === 0) {
      console.log(`💡 Creating missing assignment for collector_id ${collectorId} → San Isidro...`);
      try {
        const createAssignment = await pool.query(`
          INSERT INTO collector_barangay_assignments (collector_id, barangay_id, status, created_at)
          VALUES ($1, 6, 'active', CURRENT_TIMESTAMP)
          RETURNING assignment_id, collector_id, barangay_id, status
        `, [collectorId]);
        
        console.log('✅ Assignment created:', createAssignment.rows[0]);
      } catch (error) {
        console.log('❌ Error creating assignment:', error.message);
      }
    } else {
      console.log('✅ Assignment already exists:', assignmentExists.rows[0]);
    }
    
    // 9. Final verification
    console.log('\n9️⃣ FINAL VERIFICATION:');
    const finalCheck = await pool.query(`
      SELECT 
        cba.assignment_id,
        cba.collector_id,
        cba.barangay_id,
        cba.status,
        b.barangay_name,
        c.user_id
      FROM collector_barangay_assignments cba
      JOIN barangays b ON cba.barangay_id = b.barangay_id
      JOIN collectors c ON cba.collector_id = c.collector_id
      WHERE c.user_id = 281 AND cba.status = 'active'
    `);
    
    console.log(`Final result: user_id 281 has ${finalCheck.rows.length} active assignments:`);
    finalCheck.rows.forEach(assignment => {
      console.log(`   ✅ ${assignment.barangay_name} (assignment_id: ${assignment.assignment_id}, collector_id: ${assignment.collector_id})`);
    });
    
    if (finalCheck.rows.length > 0) {
      console.log('\n🎉 SUCCESS! The collector should now be able to see barangay assignments.');
      console.log('📱 Try the mobile app again - it should work now!');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugCollectorAssignments();
