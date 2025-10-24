// Quick Collection Reset Script - Simple and Fast
const { pool } = require('./config/db');

// CONFIGURATION - MODIFY THESE VALUES
const RESET_CONFIG = {
  // Choose ONE of these options:
  barangay_name: 'City Heights',  // Reset specific barangay (set to null for all)
  // barangay_id: 19,             // OR use barangay ID
  // collector_id: 141,           // OR reset specific collector
  // reset_date: '2025-10-24',    // OR reset specific date
  
  // Safety switch - CHANGE TO false TO ACTUALLY DELETE DATA
  dry_run: true
};

async function quickReset() {
  console.log('🔄 Quick Collection Reset\n');
  
  try {
    let whereClause = '';
    let params = [];
    let description = '';
    
    // Build query based on config
    if (RESET_CONFIG.barangay_name) {
      whereClause = `
        WHERE b.barangay_name = $1
        AND a.barangay_id = b.barangay_id
        AND u.address_id = a.address_id
        AND cse.user_id = u.user_id
      `;
      params = [RESET_CONFIG.barangay_name];
      description = `barangay "${RESET_CONFIG.barangay_name}"`;
      
    } else if (RESET_CONFIG.barangay_id) {
      whereClause = `
        WHERE b.barangay_id = $1
        AND a.barangay_id = b.barangay_id
        AND u.address_id = a.address_id
        AND cse.user_id = u.user_id
      `;
      params = [RESET_CONFIG.barangay_id];
      description = `barangay ID ${RESET_CONFIG.barangay_id}`;
      
    } else if (RESET_CONFIG.collector_id) {
      whereClause = `WHERE cse.collector_id = $1`;
      params = [RESET_CONFIG.collector_id];
      description = `collector ID ${RESET_CONFIG.collector_id}`;
      
    } else if (RESET_CONFIG.reset_date) {
      whereClause = `WHERE DATE(cse.created_at) = $1`;
      params = [RESET_CONFIG.reset_date];
      description = `date ${RESET_CONFIG.reset_date}`;
      
    } else {
      description = 'ALL collections (DANGEROUS!)';
    }
    
    console.log(`🎯 Target: ${description}`);
    console.log(`🔒 Dry Run: ${RESET_CONFIG.dry_run ? 'YES (Safe)' : 'NO (Will Delete!)'}\n`);
    
    // Check what will be deleted
    const checkQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT cse.user_id) as users,
        COUNT(DISTINCT b.barangay_name) as barangays,
        STRING_AGG(DISTINCT b.barangay_name, ', ') as barangay_list
      FROM collection_stop_events cse
      ${RESET_CONFIG.barangay_name || RESET_CONFIG.barangay_id ? 
        ', addresses a, barangays b, users u' : 
        RESET_CONFIG.collector_id || RESET_CONFIG.reset_date ? 
        '' : ', addresses a, barangays b, users u'
      }
      ${whereClause}
    `;
    
    const checkResult = await pool.query(checkQuery, params);
    const stats = checkResult.rows[0];
    
    console.log('📊 CURRENT DATA:');
    console.log(`   Events to delete: ${stats.total_events}`);
    console.log(`   Users affected: ${stats.users}`);
    console.log(`   Barangays: ${stats.barangay_list || 'None'}\n`);
    
    if (stats.total_events === '0') {
      console.log('✅ No data found to delete. Nothing to reset.');
      return;
    }
    
    // Perform deletion
    if (RESET_CONFIG.dry_run) {
      console.log('⚠️ DRY RUN MODE - No data deleted');
      console.log('   Set dry_run: false to actually execute');
    } else {
      console.log('🚨 DELETING DATA...');
      
      const deleteQuery = `
        DELETE FROM collection_stop_events cse
        ${RESET_CONFIG.barangay_name || RESET_CONFIG.barangay_id ? 
          'USING addresses a, barangays b, users u' : ''}
        ${whereClause}
      `;
      
      const deleteResult = await pool.query(deleteQuery, params);
      console.log(`✅ Deleted ${deleteResult.rowCount} collection events`);
      
      // Also clean up related tables
      if (RESET_CONFIG.barangay_name) {
        await pool.query(`
          DELETE FROM collection_results 
          WHERE barangay_id = (SELECT barangay_id FROM barangays WHERE barangay_name = $1)
        `, [RESET_CONFIG.barangay_name]);
        
        await pool.query(`
          DELETE FROM user_collection_results 
          WHERE barangay_id = (SELECT barangay_id FROM barangays WHERE barangay_name = $1)
        `, [RESET_CONFIG.barangay_name]);
      }
      
      console.log('✅ Reset completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Show available barangays first
async function showBarangays() {
  try {
    const result = await pool.query(`
      SELECT b.barangay_id, b.barangay_name, COUNT(cse.event_id) as events
      FROM barangays b
      LEFT JOIN addresses a ON a.barangay_id = b.barangay_id
      LEFT JOIN users u ON u.address_id = a.address_id
      LEFT JOIN collection_stop_events cse ON cse.user_id = u.user_id
      GROUP BY b.barangay_id, b.barangay_name
      ORDER BY events DESC, b.barangay_name
    `);
    
    console.log('🏘️ Available Barangays with Collection Data:');
    result.rows.forEach(row => {
      if (row.events > 0) {
        console.log(`   ${row.barangay_name} (ID: ${row.barangay_id}) - ${row.events} events`);
      }
    });
    console.log('');
    
  } catch (error) {
    console.log('Could not load barangays:', error.message);
  }
}

// Run the script
async function main() {
  await showBarangays();
  await quickReset();
}

main();
