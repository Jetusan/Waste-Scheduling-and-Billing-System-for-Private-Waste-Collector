const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const fs = require('fs');
const path = require('path');
const { authenticateJWT } = require('../middleware/auth');

// GET /api/collector/assignments/today?collector_id=123
// Returns a lightweight assignment object and a list of resident stops for barangays scheduled today.
router.get('/today', async (req, res) => {
  try {
    const { collector_id, user_id } = req.query;

    // Compute today's weekday name in Asia/Manila timezone and also numeric DOW
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    const todayDow = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' })
      ? new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getDay()
      : new Date().getDay();

    // Resolve collector_id if only user_id is provided
    let cid = null;
    if (collector_id) {
      cid = parseInt(collector_id, 10);
      if (!Number.isFinite(cid)) cid = null;
    } else if (user_id) {
      try {
        const r = await pool.query('SELECT collector_id FROM collectors WHERE user_id = $1', [parseInt(user_id, 10)]);
        cid = r.rows[0]?.collector_id || null;
      } catch (e) {
        console.warn('Failed to resolve collector_id from user_id:', e.message);
        cid = null;
      }
    }

    console.log(`Looking for schedules on: ${todayName} (DOW: ${todayDow}) (collector_id: ${cid || 'none'})`);

    // Query: find all schedules for today and expand to barangays and residents (role_id = 3)
    // Show ALL schedules for today regardless of collector barangay
    const q = `
      SELECT
        cs.schedule_id,
        cs.waste_type,
        cs.time_range,
        b.barangay_id,
        b.barangay_name,
        u.user_id,
        CONCAT(un.first_name, ' ', un.last_name) AS resident_name,
        COALESCE(
          NULLIF(TRIM(a.full_address), ''),
          CONCAT_WS(', ', NULLIF(TRIM(a.street), ''), NULLIF(TRIM(a.subdivision), ''), b.barangay_name, NULLIF(TRIM(a.city_municipality), ''))
        ) AS address,
        ass.latest_action,
        ass.updated_at AS latest_updated_at
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      JOIN users u ON u.role_id = 3 AND u.address_id IS NOT NULL AND u.approval_status = 'approved'
      JOIN addresses a ON a.address_id = u.address_id AND a.barangay_id = b.barangay_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN assignment_stop_status ass ON ass.schedule_id = cs.schedule_id AND ass.user_id = u.user_id
      WHERE (
        -- Case 1: schedule_date stored as weekday text
        LOWER(TRIM(cs.schedule_date)) = LOWER($1)
        OR (
          -- Case 2: schedule_date stored as ISO date text 'YYYY-MM-DD' -> compare DOW
          cs.schedule_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND EXTRACT(DOW FROM to_date(cs.schedule_date, 'YYYY-MM-DD')) = $2::int
        )
      )
      AND (
        $3::int IS NULL OR EXISTS (
          SELECT 1 FROM collector_assignments ca
          WHERE ca.schedule_id = cs.schedule_id
            AND ca.collector_id = $3::int
            AND (ca.effective_start_date IS NULL OR ca.effective_start_date <= CURRENT_DATE)
            AND (ca.effective_end_date IS NULL OR ca.effective_end_date >= CURRENT_DATE)
        )
      )
      ORDER BY b.barangay_name, a.street NULLS LAST, u.user_id
    `;

    const result = await pool.query(q, [todayName, todayDow, cid]);
    console.log(`Found ${result.rows.length} stops for ${todayName} (DOW ${todayDow})`);

    // Build stops array
    const stops = result.rows.map((r, idx) => ({
      stop_id: `${r.schedule_id}-${r.user_id}`,
      sequence_no: idx + 1,
      user_id: r.user_id,
      resident_name: r.resident_name || 'Unknown Resident',
      address: r.address,
      barangay_id: r.barangay_id,
      barangay_name: r.barangay_name,
      planned_waste_type: r.waste_type,
      schedule_id: r.schedule_id,
      time_range: r.time_range,
      latest_action: r.latest_action || null,
      latest_updated_at: r.latest_updated_at || null,
    }));

    // Minimal assignment shell; can be expanded when you model per-collector assignments
    const assignment = result.rows[0]
      ? {
          schedule_id: result.rows[0].schedule_id,
          waste_type: result.rows[0].waste_type,
          time_range: result.rows[0].time_range,
          date_label: todayName,
          schedule_date: todayName,
        }
      : null;

    console.log(`Returning assignment:`, assignment);
    console.log(`Returning ${stops.length} stops`);

    return res.json({ assignment, stops });
  } catch (err) {
    console.error('Error building today assignment:', err);
    return res.status(500).json({ error: 'Failed to fetch today\'s assignment', message: err.message });
  }
});

module.exports = router;

// ===== Stop lifecycle endpoints =====
// POST /api/collector/assignments/stop/start
// POST /api/collector/assignments/stop/collected
// POST /api/collector/assignments/stop/missed

function backupWrite(event) {
  try {
    const dir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `collection_events_${new Date().toISOString().slice(0,10)}.json`);
    const record = { ...event, ts: new Date().toISOString() };
    let data = [];
    if (fs.existsSync(file)) {
      try { data = JSON.parse(fs.readFileSync(file, 'utf-8') || '[]'); } catch { data = []; }
    }
    data.push(record);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write backup event log:', e.message);
  }
}

async function recordEventDb(event) {
  // Try to save to DB if table exists. If fails, let caller handle fallback.
  const {
    action, stop_id, schedule_id, user_id, collector_id,
    notes, amount, lat, lng
  } = event;
  const q = `
    INSERT INTO collection_stop_events (
      action, stop_id, schedule_id, user_id, collector_id, notes, amount, lat, lng, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
  `;
  await pool.query(q, [action, stop_id || null, schedule_id || null, user_id, collector_id, notes || null, amount || null, lat || null, lng || null]);

  // Also upsert latest status for this stop into assignment_stop_status
  if (schedule_id && user_id) {
    const upsert = `
      INSERT INTO assignment_stop_status (schedule_id, user_id, latest_action, latest_notes, latest_amount, latest_lat, latest_lng, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())
      ON CONFLICT (schedule_id, user_id)
      DO UPDATE SET
        latest_action = EXCLUDED.latest_action,
        latest_notes = EXCLUDED.latest_notes,
        latest_amount = EXCLUDED.latest_amount,
        latest_lat = EXCLUDED.latest_lat,
        latest_lng = EXCLUDED.latest_lng,
        updated_at = NOW();
    `;
    await pool.query(upsert, [schedule_id, user_id, action, notes || null, amount || null, lat || null, lng || null]);
  }
}

async function notifyResident(userId, title, message) {
  try {
    if (!userId) return;
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at)
       VALUES ($1, $2, $3, false, NOW())`,
      [parseInt(userId, 10), String(title || ''), String(message || '')]
    );
  } catch (e) {
    console.warn('Failed to insert resident notification:', e.message);
  }
}

async function notifyAdmins(title, message) {
  try {
    const admins = await pool.query(
      `SELECT u.user_id
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role_name = 'admin'`
    );
    for (const row of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, is_read, created_at)
         VALUES ($1, $2, $3, false, NOW())`,
        [row.user_id, String(title || ''), String(message || '')]
      );
    }
  } catch (e) {
    console.warn('Failed to insert admin notifications:', e.message);
  }
}

async function handleEvent(req, res, action) {
  try {
    const { stop_id, schedule_id, user_id, collector_id, notes, amount, lat, lng, missed_reason } = req.body || {};
    if (!user_id || !collector_id) {
      return res.status(400).json({ success: false, message: 'user_id and collector_id are required' });
    }

    // Append missed_reason to notes for audit, without schema change
    const composedNotes = action === 'missed' && missed_reason
      ? `${notes ? notes + ' ' : ''}(reason=${missed_reason})`
      : notes;

    const event = { action, stop_id, schedule_id, user_id: parseInt(user_id, 10), collector_id: parseInt(collector_id, 10), notes: composedNotes, amount, lat, lng };

    // Extras to include in response body for client hints
    const responseExtras = {};

    try {
      await recordEventDb(event);
    } catch (dbErr) {
      console.warn('DB insert failed for collection_stop_events, writing to backup log. Error:', dbErr.message);
      backupWrite(event);
    }

    // If missed and collector_fault, create a catch-up task (currently next day, Asia/Manila)
    if (action === 'missed' && missed_reason === 'collector_fault') {
      try {
        const nowManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const tomorrow = new Date(nowManila);
        tomorrow.setDate(nowManila.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD for DATE column

        await pool.query(
          `INSERT INTO reschedule_tasks (user_id, origin_schedule_id, scheduled_date, status, source, notes)
           VALUES ($1, $2, $3::date, 'pending', 'missed', $4)`,
          [parseInt(user_id, 10), schedule_id || null, dateStr, `Auto catch-up from missed (collector fault). ${composedNotes || ''}`.trim()]
        );

        // Notify resident: catch-up planned (non-committal)
        await notifyResident(
          user_id,
          'Collection missed — catch-up planned',
          'We missed your collection today due to an operational issue. We will notify you once your catch-up pickup is scheduled.'
        );
        // Notify admins
        await notifyAdmins('Missed (Ops)', `Collector-fault missed for user ${user_id}. Catch-up scheduled for ${dateStr}. Collector #${collector_id}.`);

        // Include tentative date for client to show as tentative info
        responseExtras.next_catchup_date = dateStr;
      } catch (e) {
        console.warn('Failed to insert reschedule_tasks:', e.message);
      }
    }

    // Notifications for other cases
    if (action === 'missed' && missed_reason !== 'collector_fault') {
      await notifyResident(user_id, 'Collection missed', 'We could not collect today. We’ll try again on your next scheduled pickup.');
      await notifyAdmins('Missed (Resident)', `Resident-fault missed for user ${user_id}. Will roll over to next schedule. Collector #${collector_id}.`);
    }
    if (action === 'collected') {
      await notifyResident(user_id, 'Collection completed', 'Your waste was collected today. Thank you!');
      await notifyAdmins('Collected', `Collected by collector #${collector_id} for user ${user_id} (schedule ${schedule_id || 'N/A'}).`);
    }

    return res.json({ success: true, ...responseExtras });
  } catch (error) {
    console.error(`Error handling ${action} event:`, error);
    return res.status(500).json({ success: false, message: 'Failed to record event', details: error.message });
  }
}

router.post('/stop/start', authenticateJWT, async (req, res) => handleEvent(req, res, 'start'));
router.post('/stop/collected', authenticateJWT, async (req, res) => handleEvent(req, res, 'collected'));
router.post('/stop/missed', authenticateJWT, async (req, res) => handleEvent(req, res, 'missed'));

// ===== Catch-ups (Missed) endpoints =====
// GET /api/collector/assignments/catchups/today?collector_id=123
router.get('/catchups/today', authenticateJWT, async (req, res) => {
  try {
    const { collector_id } = req.query;

    const nowManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const yyyy = nowManila.getFullYear();
    const mm = String(nowManila.getMonth() + 1).padStart(2, '0');
    const dd = String(nowManila.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    let cid = null;
    if (collector_id) {
      const parsed = parseInt(collector_id, 10);
      cid = Number.isFinite(parsed) ? parsed : null;
    }

    // Build catch-up list for today, filtered to schedules assigned to this collector if provided
    const q = `
      SELECT
        rt.id AS task_id,
        rt.user_id,
        rt.origin_schedule_id AS schedule_id,
        u.user_id AS u_user_id,
        CONCAT(un.first_name, ' ', un.last_name) AS resident_name,
        COALESCE(
          NULLIF(TRIM(a.full_address), ''),
          CONCAT_WS(', ', NULLIF(TRIM(a.street), ''), NULLIF(TRIM(a.subdivision), ''), b.barangay_name, NULLIF(TRIM(a.city_municipality), ''))
        ) AS address,
        b.barangay_id,
        b.barangay_name,
        rt.notes
      FROM reschedule_tasks rt
      JOIN users u ON u.user_id = rt.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON a.address_id = u.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE rt.status = 'pending'
        AND rt.scheduled_date = $1::date
        AND (
          $2::int IS NULL OR (
            rt.origin_schedule_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM collector_assignments ca
              WHERE ca.schedule_id = rt.origin_schedule_id
                AND ca.collector_id = $2::int
                AND (ca.effective_start_date IS NULL OR ca.effective_start_date <= CURRENT_DATE)
                AND (ca.effective_end_date IS NULL OR ca.effective_end_date >= CURRENT_DATE)
            )
          )
        )
      ORDER BY b.barangay_name, u.user_id
    `;

    const r = await pool.query(q, [todayStr, cid]);
    const stops = r.rows.map((row, idx) => ({
      stop_id: `catchup-${row.task_id}`,
      sequence_no: idx + 1,
      user_id: row.user_id,
      resident_name: row.resident_name || 'Unknown Resident',
      address: row.address,
      barangay_id: row.barangay_id,
      barangay_name: row.barangay_name,
      planned_waste_type: 'Catch-up',
      schedule_id: row.schedule_id,
      time_range: 'Catch-up',
      latest_action: 'catchup',
      latest_updated_at: null,
      task_id: row.task_id,
    }));

    return res.json({ success: true, stops });
  } catch (e) {
    console.error('Failed to fetch catch-ups:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch catch-ups', details: e.message });
  }
});

// POST /api/collector/assignments/catchups/complete
// Marks a catch-up task as completed and records a collected event for audit
router.post('/catchups/complete', authenticateJWT, async (req, res) => {
  try {
    const { task_id, user_id, collector_id, notes } = req.body || {};
    if (!task_id || !user_id || !collector_id) {
      return res.status(400).json({ success: false, message: 'task_id, user_id, collector_id are required' });
    }

    // Fetch the task to get origin_schedule_id
    const tr = await pool.query('SELECT origin_schedule_id FROM reschedule_tasks WHERE id = $1 AND status = \"pending\"', [task_id]);
    const task = tr.rows[0];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Pending catch-up task not found' });
    }

    // Mark task completed
    await pool.query('UPDATE reschedule_tasks SET status = \"completed\" WHERE id = $1', [task_id]);

    // Record collected event
    await recordEventDb({
      action: 'collected',
      stop_id: `catchup-${task_id}`,
      schedule_id: task.origin_schedule_id || null,
      user_id: parseInt(user_id, 10),
      collector_id: parseInt(collector_id, 10),
      notes: notes || 'Catch-up collected',
      amount: null,
      lat: null,
      lng: null,
    });

    return res.json({ success: true });
  } catch (e) {
    console.error('Failed to complete catch-up:', e);
    return res.status(500).json({ success: false, message: 'Failed to complete catch-up', details: e.message });
  }
});
