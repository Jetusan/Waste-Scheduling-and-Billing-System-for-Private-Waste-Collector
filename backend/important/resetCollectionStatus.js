// scripts/resetCollectionStatus.js
// Reset users' collection status by clearing latest_action (and optional events)
// Usage examples:
//   node scripts/resetCollectionStatus.js --user-ids=139,200 --dry-run
//   node scripts/resetCollectionStatus.js --user-ids=139,200 --apply
//   node scripts/resetCollectionStatus.js --all --apply --include-events
// Flags:
//   --user-ids=LIST    Comma-separated list of user_ids to target
//   --all              Target all users that have a status/event
//   --dry-run          Show what would be changed (default)
//   --apply            Execute the changes
//   --include-events   Also delete rows from collection_stop_events for targeted users

const { pool } = require('../config/db');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: true, includeEvents: false, all: false, userIds: [] };
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
    }
  }
  if (!opts.all && opts.userIds.length === 0) {
    throw new Error('Specify --user-ids=... or --all');
  }
  return opts;
}

async function main() {
  console.log('⚙️ Resetting collection status (assignment_stop_status.latest_*)');
  const opts = parseArgs();
  console.log('Options:', {
    all: opts.all,
    userIds: opts.userIds,
    dryRun: opts.dryRun,
    includeEvents: opts.includeEvents,
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

    // Optionally preview events
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

    if (opts.dryRun) {
      console.log('\nDry-run mode: no changes applied. Add --apply to execute.');
      return;
    }

    // Apply changes inside a transaction
    await pool.query('BEGIN');

    // Remove status rows entirely to avoid NOT NULL constraint on latest_action
    const clearSql = `
      DELETE FROM assignment_stop_status
      ${whereClause}
    `;
    const clearRes = await pool.query(clearSql, params);
    console.log(`✅ Removed status rows from assignment_stop_status: ${clearRes.rowCount} rows deleted.`);

    // Optionally delete events
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

    await pool.query('COMMIT');
    console.log('🎉 Done.');
  } catch (e) {
    console.error('❌ Error:', e.message);
    try { await pool.query('ROLLBACK'); } catch {}
  } finally {
    await pool.end();
  }
}

main();
