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

async function cleanupDuplicateCollectors() {
  try {
    console.log('🧹 Cleaning up duplicate collector records...');
    
    // Set search path for Neon compatibility
    await pool.query('SET search_path TO public');
    
    // 1. Find duplicate collector records
    console.log('\n1️⃣ FINDING DUPLICATE COLLECTORS:');
    const duplicates = await pool.query(`
      SELECT 
        user_id,
        COUNT(*) as collector_count,
        ARRAY_AGG(collector_id ORDER BY collector_id) as collector_ids,
        ARRAY_AGG(created_at ORDER BY collector_id) as created_dates
      FROM collectors
      GROUP BY user_id
      HAVING COUNT(*) > 1
      ORDER BY user_id
    `);
    
    console.log(`Found ${duplicates.rows.length} users with duplicate collector records:`);
    duplicates.rows.forEach(dup => {
      console.log(`   User ${dup.user_id}: ${dup.collector_count} collectors (IDs: ${dup.collector_ids.join(', ')})`);
    });
    
    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicate collectors found');
      return;
    }
    
    // 2. For each duplicate, consolidate to the latest collector record
    console.log('\n2️⃣ CONSOLIDATING DUPLICATE COLLECTORS:');
    
    for (const duplicate of duplicates.rows) {
      const { user_id, collector_ids } = duplicate;
      
      // Get the latest (highest ID) collector record to keep
      const keepCollectorId = Math.max(...collector_ids);
      const removeCollectorIds = collector_ids.filter(id => id !== keepCollectorId);
      
      console.log(`\n👤 Processing user_id ${user_id}:`);
      console.log(`   ✅ Keeping collector_id: ${keepCollectorId}`);
      console.log(`   ❌ Removing collector_ids: ${removeCollectorIds.join(', ')}`);
      
      // Check assignments for all collector IDs
      const allAssignments = await pool.query(`
        SELECT collector_id, assignment_id, barangay_id, subdivision
        FROM collector_barangay_assignments
        WHERE collector_id = ANY($1)
        ORDER BY collector_id
      `, [collector_ids]);
      
      console.log(`   📋 Found ${allAssignments.rows.length} assignments across all collector IDs`);
      
      // Group assignments by collector_id
      const assignmentsByCollector = {};
      allAssignments.rows.forEach(assignment => {
        if (!assignmentsByCollector[assignment.collector_id]) {
          assignmentsByCollector[assignment.collector_id] = [];
        }
        assignmentsByCollector[assignment.collector_id].push(assignment);
      });
      
      // Move all assignments to the keeper collector
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const removeId of removeCollectorIds) {
          const assignments = assignmentsByCollector[removeId] || [];
          
          console.log(`   📦 Moving ${assignments.length} assignments from collector_id ${removeId} to ${keepCollectorId}`);
          
          for (const assignment of assignments) {
            // Check if keeper already has assignment for this barangay
            const existingAssignment = await client.query(`
              SELECT assignment_id 
              FROM collector_barangay_assignments 
              WHERE collector_id = $1 AND barangay_id = $2
            `, [keepCollectorId, assignment.barangay_id]);
            
            if (existingAssignment.rows.length === 0) {
              // Move assignment to keeper
              await client.query(`
                UPDATE collector_barangay_assignments 
                SET collector_id = $1 
                WHERE assignment_id = $2
              `, [keepCollectorId, assignment.assignment_id]);
              
              console.log(`     ✅ Moved assignment ${assignment.assignment_id} (barangay ${assignment.barangay_id})`);
            } else {
              // Keeper already has assignment for this barangay, delete duplicate
              await client.query(`
                DELETE FROM collector_barangay_assignments 
                WHERE assignment_id = $1
              `, [assignment.assignment_id]);
              
              console.log(`     🗑️ Deleted duplicate assignment ${assignment.assignment_id} (barangay ${assignment.barangay_id})`);
            }
          }
          
          // Delete the duplicate collector record
          await client.query(`
            DELETE FROM collectors WHERE collector_id = $1
          `, [removeId]);
          
          console.log(`   🗑️ Deleted duplicate collector_id ${removeId}`);
        }
        
        await client.query('COMMIT');
        console.log(`   ✅ Successfully consolidated user_id ${user_id}`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Error consolidating user_id ${user_id}:`, error.message);
      } finally {
        client.release();
      }
    }
    
    // 3. Final verification
    console.log('\n3️⃣ FINAL VERIFICATION:');
    
    // Check for remaining duplicates
    const remainingDuplicates = await pool.query(`
      SELECT user_id, COUNT(*) as collector_count
      FROM collectors
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `);
    
    if (remainingDuplicates.rows.length === 0) {
      console.log('✅ No duplicate collectors remain');
    } else {
      console.log(`❌ Still have ${remainingDuplicates.rows.length} users with duplicates`);
    }
    
    // Check collector_1 specifically
    const collector1Status = await pool.query(`
      SELECT 
        c.collector_id,
        c.user_id,
        c.status,
        COUNT(cba.assignment_id) as assignment_count
      FROM collectors c
      LEFT JOIN users u ON c.user_id = u.user_id
      LEFT JOIN collector_barangay_assignments cba ON c.collector_id = cba.collector_id
      WHERE u.username = 'collector_1'
      GROUP BY c.collector_id, c.user_id, c.status
      ORDER BY c.collector_id
    `);
    
    console.log(`\n📊 collector_1 status:`);
    collector1Status.rows.forEach(collector => {
      console.log(`   collector_id ${collector.collector_id}: ${collector.assignment_count} assignments`);
    });
    
    if (collector1Status.rows.length === 1) {
      console.log('✅ collector_1 now has exactly one collector record');
      
      if (collector1Status.rows[0].assignment_count > 0) {
        console.log('✅ collector_1 has assignments - mobile app should work now!');
      } else {
        console.log('⚠️ collector_1 has no assignments - you may need to create one in admin panel');
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

cleanupDuplicateCollectors();
