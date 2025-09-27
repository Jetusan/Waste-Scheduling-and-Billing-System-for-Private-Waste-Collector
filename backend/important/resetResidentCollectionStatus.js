

const { pool } = require('../config/db');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { 
    dryRun: true, 
    includeEvents: false, 
    includeMissed: false,
    includeResults: false,
    all: false, 
    userIds: [] 
  };
  
  for (const a of args) {
    if (a.startsWith('--user-ids=')) {
      const v = a.split('=')[1] || '';
      opts.userIds = v
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => Number.isFinite(n));
    } else if (a === '--all') {
      opts.all = true;
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--apply') {
      opts.dryRun = false;
    } else if (a === '--include-events') {
      opts.includeEvents = true;
    } else if (a === '--include-missed') {
      opts.includeMissed = true;
    } else if (a === '--include-results') {
      opts.includeResults = true;
    }
  }
  
  if (!opts.all && opts.userIds.length === 0) {
    throw new Error('Specify --user-ids=... or --all');
  }
  return opts;
}

async function main() {
  console.log('⚙️ Resetting resident collection status for testing');
  const opts = parseArgs();
  console.log('Options:', {
    all: opts.all,
    userIds: opts.userIds,
    dryRun: opts.dryRun,
    includeEvents: opts.includeEvents,
    includeMissed: opts.includeMissed,
    includeResults: opts.includeResults,
  });

  try {
    // Build filters
    let whereClause = '';
    const params = [];
    if (!opts.all) {
      whereClause = `WHERE user_id = ANY($1)`;
      params.push(opts.userIds);
    }

    // Preview affected rows in assignment_stop_status
    const previewAss = await pool.query(
      `SELECT schedule_id, user_id, latest_action, updated_at
       FROM assignment_stop_status
       ${whereClause}
       ORDER BY user_id, schedule_id
       LIMIT 1000`,
      params
    );
    console.log(`🔎 assignment_stop_status rows matched: ${previewAss.rowCount}`);
    if (previewAss.rowCount > 0) {
      console.table(previewAss.rows);
    }

    // Preview user_collection_results if requested
    let previewResults = { rowCount: 0, rows: [] };
    if (opts.includeResults) {
      if (opts.all) {
        previewResults = await pool.query(
          `SELECT user_result_id, user_id, status, collected_at, reason
           FROM user_collection_results
           ORDER BY user_result_id DESC
           LIMIT 1000`
        );
      } else {
        previewResults = await pool.query(
          `SELECT user_result_id, user_id, status, collected_at, reason
           FROM user_collection_results
           WHERE user_id = ANY($1)
           ORDER BY user_result_id DESC
           LIMIT 1000`,
          [opts.userIds]
        );
      }
      console.log(`🔎 user_collection_results rows matched: ${previewResults.rowCount}`);
      if (previewResults.rowCount > 0) {
        console.table(previewResults.rows);
      }
    }

    // Preview collection_stop_events if requested
    let previewEvt = { rowCount: 0, rows: [] };
    if (opts.includeEvents) {
      if (opts.all) {
        previewEvt = await pool.query(
          `SELECT id, action, stop_id, schedule_id, user_id, collector_id, created_at
           FROM collection_stop_events
           ORDER BY id DESC
           LIMIT 1000`
        );
      } else {
        previewEvt = await pool.query(
          `SELECT id, action, stop_id, schedule_id, user_id, collector_id, created_at
           FROM collection_stop_events
           WHERE user_id = ANY($1)
           ORDER BY id DESC
           LIMIT 1000`,
          [opts.userIds]
        );
      }
      console.log(`🔎 collection_stop_events rows matched: ${previewEvt.rowCount}`);
      if (previewEvt.rowCount > 0) {
        console.table(previewEvt.rows);
      }
    }

    // Preview missed collections and catchup tasks if requested
    let previewMissed = { rowCount: 0, rows: [] };
    let previewCatchup = { rowCount: 0, rows: [] };
    if (opts.includeMissed) {
      if (opts.all) {
        previewMissed = await pool.query(
          `SELECT missed_collection_id, user_id, collector_id, fault_type, issue_description, severity, reported_at
           FROM missed_collections
           ORDER BY missed_collection_id DESC
           LIMIT 1000`
        );
        previewCatchup = await pool.query(
          `SELECT task_id, user_id, collector_id, scheduled_date, priority, status
           FROM catchup_tasks
           ORDER BY task_id DESC
           LIMIT 1000`
        );
      } else {
        previewMissed = await pool.query(
          `SELECT missed_collection_id, user_id, collector_id, fault_type, issue_description, severity, reported_at
           FROM missed_collections
           WHERE user_id = ANY($1)
           ORDER BY missed_collection_id DESC
           LIMIT 1000`,
          [opts.userIds]
        );
        previewCatchup = await pool.query(
          `SELECT task_id, user_id, collector_id, scheduled_date, priority, status
           FROM catchup_tasks
           WHERE user_id = ANY($1)
           ORDER BY task_id DESC
           LIMIT 1000`,
          [opts.userIds]
        );
      }
      console.log(`🔎 missed_collections rows matched: ${previewMissed.rowCount}`);
      if (previewMissed.rowCount > 0) {
        console.table(previewMissed.rows);
      }
      console.log(`🔎 catchup_tasks rows matched: ${previewCatchup.rowCount}`);
      if (previewCatchup.rowCount > 0) {
        console.table(previewCatchup.rows);
      }
    }

    if (opts.dryRun) {
      console.log('\n🔍 Dry-run mode: no changes applied. Add --apply to execute.');
      return;
    }

    // Apply changes inside a transaction
    await pool.query('BEGIN');

    // 1. Remove status rows from assignment_stop_status
    const clearSql = `
      DELETE FROM assignment_stop_status
      ${whereClause}
    `;
    const clearRes = await pool.query(clearSql, params);
    console.log(`✅ Removed status rows from assignment_stop_status: ${clearRes.rowCount} rows deleted.`);

    // 2. Delete user_collection_results if requested
    if (opts.includeResults) {
      let delResultsSql = 'DELETE FROM user_collection_results';
      let delResultsParams = [];
      if (!opts.all) {
        delResultsSql += ' WHERE user_id = ANY($1)';
        delResultsParams = [opts.userIds];
      }
      const delResultsRes = await pool.query(delResultsSql, delResultsParams);
      console.log(`✅ Deleted results from user_collection_results: ${delResultsRes.rowCount} rows deleted.`);
    }

    // 3. Delete collection_stop_events if requested
    if (opts.includeEvents) {
      let delSql = 'DELETE FROM collection_stop_events';
      let delParams = [];
      if (!opts.all) {
        delSql += ' WHERE user_id = ANY($1)';
        delParams = [opts.userIds];
      }
      const delRes = await pool.query(delSql, delParams);
      console.log(`✅ Deleted events from collection_stop_events: ${delRes.rowCount} rows deleted.`);
    }

    // 4. Delete missed collections and catchup tasks if requested
    if (opts.includeMissed) {
      // Delete catchup_tasks first (foreign key dependency)
      let delCatchupSql = 'DELETE FROM catchup_tasks';
      let delCatchupParams = [];
      if (!opts.all) {
        delCatchupSql += ' WHERE user_id = ANY($1)';
        delCatchupParams = [opts.userIds];
      }
      const delCatchupRes = await pool.query(delCatchupSql, delCatchupParams);
      console.log(`✅ Deleted catchup tasks: ${delCatchupRes.rowCount} rows deleted.`);

      // Delete missed_collections
      let delMissedSql = 'DELETE FROM missed_collections';
      let delMissedParams = [];
      if (!opts.all) {
        delMissedSql += ' WHERE user_id = ANY($1)';
        delMissedParams = [opts.userIds];
      }
      const delMissedRes = await pool.query(delMissedSql, delMissedParams);
      console.log(`✅ Deleted missed collections: ${delMissedRes.rowCount} rows deleted.`);

      // Delete collection_actions related to missed collections
      let delActionsSql = 'DELETE FROM collection_actions WHERE action_type IN (\'missed_collection\', \'catchup_completed\')';
      let delActionsParams = [];
      if (!opts.all) {
        delActionsSql += ' AND user_id = ANY($1)';
        delActionsParams = [opts.userIds];
      }
      const delActionsRes = await pool.query(delActionsSql, delActionsParams);
      console.log(`✅ Deleted collection actions: ${delActionsRes.rowCount} rows deleted.`);
    }

    await pool.query('COMMIT');
    console.log('🎉 Resident collection status reset complete!');
    console.log('📝 Residents can now be collected again for testing.');
  } catch (e) {
    console.error('❌ Error:', e.message);
    try { await pool.query('ROLLBACK'); } catch {}
  } finally {
    await pool.end();
  }
}

main();
