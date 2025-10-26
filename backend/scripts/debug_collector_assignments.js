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
    
    // 2. Check collectors table
    console.log('\n2️⃣ CHECKING COLLECTORS TABLE:');
    const collectorsCheck = await pool.query(`
      SELECT collector_id, user_id, name, status
      FROM collectors 
      WHERE user_id = 281 OR collector_id = 34
    `);
    
    if (collectorsCheck.rows.length > 0) {
      console.log('✅ Collector records found:');
      collectorsCheck.rows.forEach(collector => {
        console.log(`   - collector_id: ${collector.collector_id}, user_id: ${collector.user_id}, name: ${collector.name}, status: ${collector.status}`);
      });
    } else {
      console.log('❌ No collector records found for user_id 281 or collector_id 34');
    }
    
    // 3. Check collector_barangay_assignments table
    console.log('\n3️⃣ CHECKING COLLECTOR_BARANGAY_ASSIGNMENTS:');
    const assignmentsCheck = await pool.query(`
      SELECT 
        cba.assignment_id,
        cba.collector_id,
        cba.barangay_id,
        cba.status,
        cba.created_at,
        b.barangay_name,
        c.name as collector_name
      FROM collector_barangay_assignments cba
      LEFT JOIN barangays b ON cba.barangay_id = b.barangay_id
      LEFT JOIN collectors c ON cba.collector_id = c.collector_id
      WHERE cba.collector_id = 34 OR cba.collector_id IN (
        SELECT collector_id FROM collectors WHERE user_id = 281
      )
      ORDER BY cba.created_at DESC
    `);
    
    if (assignmentsCheck.rows.length > 0) {
      console.log('✅ Barangay assignments found:');
      assignmentsCheck.rows.forEach(assignment => {
        console.log(`   - assignment_id: ${assignment.assignment_id}`);
        console.log(`     collector_id: ${assignment.collector_id}`);
        console.log(`     barangay: ${assignment.barangay_name} (ID: ${assignment.barangay_id})`);
        console.log(`     status: ${assignment.status}`);
        console.log(`     created: ${assignment.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No barangay assignments found for collector_id 34');
    }
    
    // 4. Check ALL collector_barangay_assignments to see what exists
    console.log('\n4️⃣ ALL COLLECTOR BARANGAY ASSIGNMENTS:');
    const allAssignments = await pool.query(`
      SELECT 
        cba.assignment_id,
        cba.collector_id,
        cba.barangay_id,
        cba.status,
        b.barangay_name,
        c.name as collector_name,
        u.username
      FROM collector_barangay_assignments cba
      LEFT JOIN barangays b ON cba.barangay_id = b.barangay_id
      LEFT JOIN collectors c ON cba.collector_id = c.collector_id
      LEFT JOIN users u ON c.user_id = u.user_id
      ORDER BY cba.assignment_id DESC
      LIMIT 10
    `);
    
    console.log(`Found ${allAssignments.rows.length} total assignments (showing last 10):`);
    allAssignments.rows.forEach(assignment => {
      console.log(`   - Assignment ${assignment.assignment_id}: ${assignment.username} (collector_id: ${assignment.collector_id}) → ${assignment.barangay_name} (${assignment.status})`);
    });
    
    // 5. Check if San Isidro barangay exists
    console.log('\n5️⃣ CHECKING SAN ISIDRO BARANGAY:');
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
    
    // 6. Check what the admin assignment API shows
    console.log('\n6️⃣ SIMULATING ADMIN ASSIGNMENT API:');
    const adminAssignments = await pool.query(`
      SELECT 
        cba.assignment_id,
        cba.collector_id,
        cba.barangay_id,
        cba.status as assignment_status,
        cba.created_at,
        c.name as collector_name,
        u.username,
        b.barangay_name
      FROM collector_barangay_assignments cba
      JOIN collectors c ON cba.collector_id = c.collector_id
      JOIN users u ON c.user_id = u.user_id
      JOIN barangays b ON cba.barangay_id = b.barangay_id
      WHERE cba.status = 'active'
      ORDER BY cba.created_at DESC
    `);
    
    console.log(`Admin view shows ${adminAssignments.rows.length} active assignments:`);
    adminAssignments.rows.forEach(assignment => {
      console.log(`   - ${assignment.username} → ${assignment.barangay_name} (assignment_id: ${assignment.assignment_id}, status: ${assignment.assignment_status})`);
    });
    
    // 7. SOLUTION: Create assignment if missing
    console.log('\n7️⃣ CHECKING IF WE NEED TO CREATE ASSIGNMENT:');
    
    const existingAssignment = await pool.query(`
      SELECT assignment_id 
      FROM collector_barangay_assignments 
      WHERE collector_id = 34 AND barangay_id = 6 AND status = 'active'
    `);
    
    if (existingAssignment.rows.length === 0) {
      console.log('❌ No active assignment found for collector_id 34 → San Isidro');
      console.log('💡 CREATING MISSING ASSIGNMENT...');
      
      try {
        const createResult = await pool.query(`
          INSERT INTO collector_barangay_assignments (collector_id, barangay_id, status, created_at)
          VALUES (34, 6, 'active', CURRENT_TIMESTAMP)
          RETURNING assignment_id, collector_id, barangay_id, status
        `);
        
        console.log('✅ Assignment created successfully:', createResult.rows[0]);
      } catch (error) {
        console.log('❌ Error creating assignment:', error.message);
      }
    } else {
      console.log('✅ Active assignment already exists:', existingAssignment.rows[0]);
    }
    
    // 8. Final verification
    console.log('\n8️⃣ FINAL VERIFICATION:');
    const finalCheck = await pool.query(`
      SELECT 
        cba.assignment_id,
        cba.collector_id,
        cba.barangay_id,
        cba.status,
        b.barangay_name
      FROM collector_barangay_assignments cba
      JOIN barangays b ON cba.barangay_id = b.barangay_id
      WHERE cba.collector_id = 34 AND cba.status = 'active'
    `);
    
    console.log(`Final result: collector_id 34 has ${finalCheck.rows.length} active assignments:`);
    finalCheck.rows.forEach(assignment => {
      console.log(`   ✅ ${assignment.barangay_name} (assignment_id: ${assignment.assignment_id})`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugCollectorAssignments();
