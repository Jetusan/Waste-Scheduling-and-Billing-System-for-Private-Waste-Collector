// Script to Reset Collector Collections in Specific Barangays
const { pool } = require('./config/db');

async function resetCollectorCollections() {
  console.log('🔄 WSBS Collection Reset Script\n');
  console.log('=' .repeat(60));
  
  try {
    // Configuration - Modify these as needed
    const RESET_OPTIONS = {
      // Reset by barangay (set to null to reset all)
      barangay_name: null, // e.g., 'City Heights', 'Apopong', null for all
      barangay_id: null,   // e.g., 19, 1, null for all
      
      // Reset by date (set to null to reset all dates)
      reset_date: null,    // e.g., '2025-10-24', null for all dates
      
      // Reset by collector (set to null to reset all collectors)
      collector_id: null,  // e.g., 141, null for all collectors
      
      // What to reset
      reset_collection_events: true,     // Reset collection_stop_events
      reset_collection_results: true,    // Reset collection_results  
      reset_user_results: true,         // Reset user_collection_results
      
      // Safety mode - set to false to actually execute
      dry_run: true
    };
    
    console.log('📋 RESET CONFIGURATION:');
    console.log(`   Barangay Name: ${RESET_OPTIONS.barangay_name || 'ALL'}`);
    console.log(`   Barangay ID: ${RESET_OPTIONS.barangay_id || 'ALL'}`);
    console.log(`   Date Filter: ${RESET_OPTIONS.reset_date || 'ALL DATES'}`);
    console.log(`   Collector ID: ${RESET_OPTIONS.collector_id || 'ALL COLLECTORS'}`);
    console.log(`   Dry Run Mode: ${RESET_OPTIONS.dry_run ? 'YES (Safe)' : 'NO (Will Execute)'}`);
    console.log('');
    
    // 1. Show current collection data before reset
    console.log('📊 CURRENT COLLECTION DATA:');
    console.log('-'.repeat(40));
    
    // Build conditions for filtering
    let whereConditions = [];
    let params = [];
    let paramCount = 0;
    
    if (RESET_OPTIONS.barangay_name) {
      paramCount++;
      whereConditions.push(`b.barangay_name = $${paramCount}`);
      params.push(RESET_OPTIONS.barangay_name);
    }
    
    if (RESET_OPTIONS.barangay_id) {
      paramCount++;
      whereConditions.push(`b.barangay_id = $${paramCount}`);
      params.push(RESET_OPTIONS.barangay_id);
    }
    
    if (RESET_OPTIONS.reset_date) {
      paramCount++;
      whereConditions.push(`DATE(cse.created_at) = $${paramCount}`);
      params.push(RESET_OPTIONS.reset_date);
    }
    
    if (RESET_OPTIONS.collector_id) {
      paramCount++;
      whereConditions.push(`cse.collector_id = $${paramCount}`);
      params.push(RESET_OPTIONS.collector_id);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Check collection_stop_events
    const eventsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT cse.user_id) as unique_users,
        COUNT(DISTINCT b.barangay_id) as unique_barangays,
        COUNT(DISTINCT cse.collector_id) as unique_collectors,
        STRING_AGG(DISTINCT b.barangay_name, ', ') as barangay_names,
        STRING_AGG(DISTINCT cse.action, ', ') as actions
      FROM collection_stop_events cse
      LEFT JOIN addresses a ON a.address_id = (
        SELECT address_id FROM users WHERE user_id = cse.user_id
      )
      LEFT JOIN barangays b ON b.barangay_id = a.barangay_id
      ${whereClause}
    `;
    
    const eventsResult = await pool.query(eventsQuery, params);
    const eventStats = eventsResult.rows[0];
    
    console.log('🎯 COLLECTION STOP EVENTS:');
    console.log(`   Total Events: ${eventStats.total_events}`);
    console.log(`   Unique Users: ${eventStats.unique_users}`);
    console.log(`   Unique Barangays: ${eventStats.unique_barangays}`);
    console.log(`   Unique Collectors: ${eventStats.unique_collectors}`);
    console.log(`   Barangays: ${eventStats.barangay_names || 'None'}`);
    console.log(`   Actions: ${eventStats.actions || 'None'}`);
    
    // Check collection_results
    const resultsQuery = `
      SELECT 
        COUNT(*) as total_results,
        COUNT(DISTINCT cr.collector_id) as unique_collectors,
        COUNT(DISTINCT cr.barangay_id) as unique_barangays
      FROM collection_results cr
      LEFT JOIN barangays b ON b.barangay_id = cr.barangay_id
      ${whereClause.replace('cse.', 'cr.')}
    `;
    
    const resultsResult = await pool.query(resultsQuery, params);
    const resultStats = resultsResult.rows[0];
    
    console.log('\n📋 COLLECTION RESULTS:');
    console.log(`   Total Results: ${resultStats.total_results}`);
    console.log(`   Unique Collectors: ${resultStats.unique_collectors}`);
    console.log(`   Unique Barangays: ${resultStats.unique_barangays}`);
    
    // Check user_collection_results
    const userResultsQuery = `
      SELECT 
        COUNT(*) as total_user_results,
        COUNT(DISTINCT ucr.user_id) as unique_users,
        COUNT(DISTINCT ucr.barangay_id) as unique_barangays
      FROM user_collection_results ucr
      LEFT JOIN barangays b ON b.barangay_id = ucr.barangay_id
      ${whereClause.replace('cse.', 'ucr.')}
    `;
    
    const userResultsResult = await pool.query(userResultsQuery, params);
    const userResultStats = userResultsResult.rows[0];
    
    console.log('\n👤 USER COLLECTION RESULTS:');
    console.log(`   Total User Results: ${userResultStats.total_user_results}`);
    console.log(`   Unique Users: ${userResultStats.unique_users}`);
    console.log(`   Unique Barangays: ${userResultStats.unique_barangays}`);
    
    // Show detailed breakdown by barangay
    if (!RESET_OPTIONS.barangay_name && !RESET_OPTIONS.barangay_id) {
      console.log('\n🏘️ BREAKDOWN BY BARANGAY:');
      const barangayBreakdownQuery = `
        SELECT 
          b.barangay_name,
          COUNT(DISTINCT cse.event_id) as events,
          COUNT(DISTINCT cse.user_id) as users,
          COUNT(DISTINCT cse.collector_id) as collectors
        FROM barangays b
        LEFT JOIN addresses a ON a.barangay_id = b.barangay_id
        LEFT JOIN users u ON u.address_id = a.address_id
        LEFT JOIN collection_stop_events cse ON cse.user_id = u.user_id
        GROUP BY b.barangay_id, b.barangay_name
        HAVING COUNT(DISTINCT cse.event_id) > 0
        ORDER BY events DESC
      `;
      
      const barangayResult = await pool.query(barangayBreakdownQuery);
      barangayResult.rows.forEach(row => {
        console.log(`   ${row.barangay_name}: ${row.events} events, ${row.users} users, ${row.collectors} collectors`);
      });
    }
    
    // 2. Perform reset operations
    console.log('\n🔄 RESET OPERATIONS:');
    console.log('-'.repeat(40));
    
    if (RESET_OPTIONS.dry_run) {
      console.log('⚠️ DRY RUN MODE - No data will be deleted');
      console.log('   Set dry_run: false to actually execute the reset');
    } else {
      console.log('🚨 EXECUTING RESET - Data will be permanently deleted!');
    }
    
    let totalDeleted = 0;
    
    // Reset collection_stop_events
    if (RESET_OPTIONS.reset_collection_events) {
      const deleteEventsQuery = `
        DELETE FROM collection_stop_events cse
        USING addresses a, barangays b
        WHERE a.address_id = (SELECT address_id FROM users WHERE user_id = cse.user_id)
        AND b.barangay_id = a.barangay_id
        ${whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : ''}
      `;
      
      if (RESET_OPTIONS.dry_run) {
        console.log(`\n📝 Would delete collection_stop_events with query:`);
        console.log(`   ${deleteEventsQuery}`);
        console.log(`   Parameters: [${params.join(', ')}]`);
      } else {
        const deleteResult = await pool.query(deleteEventsQuery, params);
        console.log(`✅ Deleted ${deleteResult.rowCount} collection stop events`);
        totalDeleted += deleteResult.rowCount;
      }
    }
    
    // Reset collection_results
    if (RESET_OPTIONS.reset_collection_results) {
      const deleteResultsQuery = `
        DELETE FROM collection_results cr
        USING barangays b
        WHERE b.barangay_id = cr.barangay_id
        ${whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ').replace('cse.', 'cr.') : ''}
      `;
      
      if (RESET_OPTIONS.dry_run) {
        console.log(`\n📝 Would delete collection_results with query:`);
        console.log(`   ${deleteResultsQuery}`);
        console.log(`   Parameters: [${params.join(', ')}]`);
      } else {
        const deleteResult = await pool.query(deleteResultsQuery, params);
        console.log(`✅ Deleted ${deleteResult.rowCount} collection results`);
        totalDeleted += deleteResult.rowCount;
      }
    }
    
    // Reset user_collection_results
    if (RESET_OPTIONS.reset_user_results) {
      const deleteUserResultsQuery = `
        DELETE FROM user_collection_results ucr
        USING barangays b
        WHERE b.barangay_id = ucr.barangay_id
        ${whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ').replace('cse.', 'ucr.') : ''}
      `;
      
      if (RESET_OPTIONS.dry_run) {
        console.log(`\n📝 Would delete user_collection_results with query:`);
        console.log(`   ${deleteUserResultsQuery}`);
        console.log(`   Parameters: [${params.join(', ')}]`);
      } else {
        const deleteResult = await pool.query(deleteUserResultsQuery, params);
        console.log(`✅ Deleted ${deleteResult.rowCount} user collection results`);
        totalDeleted += deleteResult.rowCount;
      }
    }
    
    // 3. Summary
    console.log('\n📊 RESET SUMMARY:');
    console.log('-'.repeat(40));
    
    if (RESET_OPTIONS.dry_run) {
      console.log('✅ Dry run completed successfully');
      console.log('   No data was actually deleted');
      console.log('   Review the queries above and set dry_run: false to execute');
    } else {
      console.log(`✅ Reset completed successfully`);
      console.log(`   Total records deleted: ${totalDeleted}`);
      console.log('   Collection data has been cleared for the specified criteria');
    }
    
    // 4. Instructions for different reset scenarios
    console.log('\n📋 USAGE EXAMPLES:');
    console.log('-'.repeat(40));
    console.log('// Reset all collections in City Heights:');
    console.log('barangay_name: "City Heights", dry_run: false');
    console.log('');
    console.log('// Reset all collections for today:');
    console.log('reset_date: "2025-10-24", dry_run: false');
    console.log('');
    console.log('// Reset all collections for specific collector:');
    console.log('collector_id: 141, dry_run: false');
    console.log('');
    console.log('// Reset everything (DANGEROUS):');
    console.log('barangay_name: null, reset_date: null, collector_id: null, dry_run: false');
    
    console.log('\n🎉 Script completed successfully!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('💥 Reset failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the reset script
resetCollectorCollections();
