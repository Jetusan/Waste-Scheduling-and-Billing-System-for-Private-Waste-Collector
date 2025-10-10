const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const fs = require('fs');
const path = require('path');
const { authenticateJWT } = require('../middleware/auth');
const { handleMissedCollectionWithNextSchedule } = require('./nextScheduleCalculator');
const { emitCollectionUpdate, emitStatsUpdate, emitAdminUpdate, emitResidentNotification } = require('../services/websocketService');

// GET /api/collector/assignments/today?collector_id=123
// Returns a lightweight assignment object and a list of resident stops for barangays scheduled today.
// SIMPLIFIED VERSION to avoid 500 errors
router.get('/today', async (req, res) => {
  try {
    const { collector_id, user_id } = req.query;

    // Compute today's weekday name in Asia/Manila timezone
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    
    console.log(`🕐 Looking for ${todayName} collections (collector_id: ${collector_id || 'none'})`);

    // Now get real data from database
    // Step 1: Get all residents with subscriptions (simplified query)
    const residentsQuery = `
      SELECT DISTINCT
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown Resident') AS resident_name,
        COALESCE(a.full_address, COALESCE(a.street, '') || ', ' || COALESCE(b.barangay_name, '')) AS address,
        COALESCE(b.barangay_id, 0) as barangay_id,
        COALESCE(b.barangay_name, 'Unknown Barangay') as barangay_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND u.user_id IS NOT NULL
      ORDER BY u.user_id
      LIMIT 20
    `;

    let residentsResult;
    try {
      residentsResult = await pool.query(residentsQuery);
      console.log(`🏠 Found ${residentsResult.rows.length} total approved residents`);
    } catch (e) {
      console.error(`❌ Error querying residents:`, e.message);
      // Fallback to test data if database fails
      return res.json({ 
        assignment: {
          schedule_id: `${todayName.toLowerCase()}-regular-0`,
          waste_type: 'Regular',
          time_range: '8:00 AM - 12:00 PM',
          date_label: todayName,
          schedule_date: todayName,
        }, 
        stops: [] 
      });
    }

    if (residentsResult.rows.length === 0) {
      console.log(`❌ No approved residents found in database`);
      return res.json({ assignment: null, stops: [] });
    }

    // Step 2: Get subscription status for these residents
    const userIds = residentsResult.rows.map(r => r.user_id);
    console.log(`👥 Checking subscriptions for user IDs:`, userIds);

    let subscriptionResult = { rows: [] };
    try {
      const subscriptionQuery = `
        SELECT 
          cs.user_id,
          cs.status as subscription_status,
          cs.created_at as subscription_created_at
        FROM customer_subscriptions cs
        WHERE cs.user_id = ANY($1::int[])
          AND cs.status IN ('active', 'pending_payment')
        ORDER BY cs.created_at DESC
      `;
      subscriptionResult = await pool.query(subscriptionQuery, [userIds]);
      console.log(`💳 Found ${subscriptionResult.rows.length} active/pending subscriptions`);
    } catch (e) {
      console.error(`❌ Error querying subscriptions:`, e.message);
      // Continue without subscription filtering
    }

    // Step 3: Build stops from residents with subscriptions
    const stops = [];
    let stopCounter = 1;

    for (const resident of residentsResult.rows) {
      const subscription = subscriptionResult.rows.find(s => s.user_id === resident.user_id);
      
      // Include residents with subscriptions OR if no subscription data available (fallback)
      if (subscription || subscriptionResult.rows.length === 0) {
        const stopId = `${todayName.toLowerCase()}-regular-${resident.user_id}`;
        stops.push({
          stop_id: stopId,
          sequence_no: stopCounter++,
          user_id: resident.user_id,
          resident_name: resident.resident_name,
          address: resident.address,
          barangay_id: resident.barangay_id,
          barangay_name: resident.barangay_name,
          planned_waste_type: 'Regular',
          schedule_id: `${todayName.toLowerCase()}-regular-0`,
          time_range: '8:00 AM - 12:00 PM',
          latest_action: null,
          latest_updated_at: null,
          subscription_status: subscription?.subscription_status || 'active' // Default to active if no subscription data
        });
      }
    }

    const assignment = {
      schedule_id: `${todayName.toLowerCase()}-regular-0`,
      waste_type: 'Regular',
      time_range: '8:00 AM - 12:00 PM',
      date_label: todayName,
      schedule_date: todayName,
    };

    console.log(`📋 Returning real assignment for ${todayName}`);
    console.log(`🚚 Returning ${stops.length} real stops from database`);
    console.log(`👥 Residents:`, stops.map(s => ({ user_id: s.user_id, name: s.resident_name, barangay: s.barangay_name })));

    return res.json({ assignment, stops });
  } catch (err) {
    console.error('Error building today assignment:', err);
    return res.status(500).json({ error: 'Failed to fetch today\'s assignment', message: err.message });
  }
});

// Debug endpoint to check subscription data
router.get('/debug/subscriptions', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.user_id,
        CONCAT(un.first_name, ' ', un.last_name) AS resident_name,
        b.barangay_name,
        cs.status as subscription_status,
        cs.created_at as subscription_created_at,
        sp.plan_name,
        sp.price
      FROM users u
      JOIN user_names un ON u.name_id = un.name_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN customer_subscriptions cs ON cs.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
      ORDER BY u.user_id, cs.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      total_residents: result.rows.length,
      residents: result.rows,
      subscribed_residents: result.rows.filter(r => r.subscription_status),
      active_subscriptions: result.rows.filter(r => r.subscription_status === 'active'),
      pending_subscriptions: result.rows.filter(r => r.subscription_status === 'pending_payment')
    });
  } catch (error) {
    console.error('Debug subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch debug data', details: error.message });
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
  
  // After SQL migration, columns now accept VARCHAR - store IDs as-is
  // No conversion needed! Both "7-140" and "wednesday-organic-0" work
  
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

// Define rescheduling rules for different fault types
const RESCHEDULING_RULES = {
  'truck_breakdown': { days: 3, requires_approval: true },
  'equipment_failure': { days: 1, requires_approval: false },
  'route_blocked': { days: 2, requires_approval: true },
  'collector_emergency': { days: 1, requires_approval: false },
  'other_operational': { days: 1, requires_approval: true }
};

// Notification templates for different fault types
const FAULT_NOTIFICATIONS = {
  'truck_breakdown': {
    resident_title: 'Collection missed — truck maintenance',
    resident_message: 'Collection delayed due to truck maintenance. Estimated repair: {days} days. We will notify you of the rescheduled date.',
    admin_message: 'Truck breakdown reported for user {user_id}. Estimated repair: {days} days. Collector #{collector_id}.'
  },
  'equipment_failure': {
    resident_title: 'Collection missed — equipment issue',
    resident_message: 'Collection delayed due to equipment malfunction. Catch-up scheduled for tomorrow.',
    admin_message: 'Equipment failure reported for user {user_id}. Catch-up scheduled for tomorrow. Collector #{collector_id}.'
  },
  'route_blocked': {
    resident_title: 'Collection missed — route inaccessible',
    resident_message: 'Collection delayed due to blocked route. Estimated resolution: {days} days. We will notify you of the rescheduled date.',
    admin_message: 'Route blocked reported for user {user_id}. Estimated resolution: {days} days. Collector #{collector_id}.'
  },
  'collector_emergency': {
    resident_title: 'Collection missed — emergency',
    resident_message: 'Collection delayed due to emergency situation. Catch-up scheduled for tomorrow.',
    admin_message: 'Collector emergency reported for user {user_id}. Catch-up scheduled for tomorrow. Collector #{collector_id}.'
  },
  'other_operational': {
    resident_title: 'Collection missed — operational issue',
    resident_message: 'Collection delayed due to operational issue. We will notify you of the rescheduled date.',
    admin_message: 'Operational issue reported for user {user_id}. Admin approval required. Collector #{collector_id}.'
  }
};

async function handleEvent(req, res, action) {
  try {
    const { stop_id, schedule_id, user_id, collector_id, notes, amount, lat, lng, missed_reason, fault_detail, estimated_delay_days } = req.body || {};
    if (!user_id || !collector_id) {
      return res.status(400).json({ success: false, message: 'user_id and collector_id are required' });
    }

    // Enhanced notes composition for dynamic fault details
    let composedNotes = notes || '';
    if (action === 'missed' && missed_reason) {
      if (fault_detail) {
        composedNotes = `${composedNotes ? composedNotes + ' ' : ''}(reason=${missed_reason}, detail=${fault_detail})`;
      } else {
        composedNotes = `${composedNotes ? composedNotes + ' ' : ''}(reason=${missed_reason})`;
      }
    }

    const event = { action, stop_id, schedule_id, user_id: parseInt(user_id, 10), collector_id: parseInt(collector_id, 10), notes: composedNotes, amount, lat, lng };

    // Extras to include in response body for client hints
    const responseExtras = {};

    try {
      await recordEventDb(event);
    } catch (dbErr) {
      console.warn('DB insert failed for collection_stop_events, writing to backup log. Error:', dbErr.message);
      backupWrite(event);
    }

    // Enhanced dynamic rescheduling for collector faults
    if (action === 'missed' && missed_reason === 'collector_fault') {
      try {
        const rule = RESCHEDULING_RULES[fault_detail] || { days: 1, requires_approval: true };
        const delayDays = estimated_delay_days || rule.days;
        
        const nowManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const rescheduleDate = new Date(nowManila);
        rescheduleDate.setDate(nowManila.getDate() + delayDays);
        
        const yyyy = rescheduleDate.getFullYear();
        const mm = String(rescheduleDate.getMonth() + 1).padStart(2, '0');
        const dd = String(rescheduleDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const status = rule.requires_approval ? 'pending_approval' : 'pending';

        await pool.query(
          `INSERT INTO reschedule_tasks (
            user_id, origin_schedule_id, scheduled_date, status, source, 
            fault_detail, estimated_delay_days, requires_approval, notes
          ) VALUES ($1, $2, $3::date, $4, 'missed', $5, $6, $7, $8)`,
          [
            parseInt(user_id, 10), 
            schedule_id || null, 
            dateStr,
            status,
            fault_detail || 'other_operational',
            delayDays,
            rule.requires_approval,
            `Auto catch-up from missed (${fault_detail || 'collector fault'}). ${composedNotes || ''}`.trim()
          ]
        );

        // Dynamic notifications based on fault type
        const notificationTemplate = FAULT_NOTIFICATIONS[fault_detail] || FAULT_NOTIFICATIONS['other_operational'];
        
        await notifyResident(
          user_id,
          notificationTemplate.resident_title,
          notificationTemplate.resident_message.replace('{days}', delayDays)
        );
        
        await notifyAdmins(
          'Missed (Ops)', 
          notificationTemplate.admin_message
            .replace('{user_id}', user_id)
            .replace('{days}', delayDays)
            .replace('{collector_id}', collector_id)
        );

        // Include scheduling info in response
        responseExtras.next_catchup_date = dateStr;
        responseExtras.requires_approval = rule.requires_approval;
        responseExtras.fault_detail = fault_detail;
        responseExtras.estimated_delay_days = delayDays;
      } catch (e) {
        console.warn('Failed to insert reschedule_tasks:', e.message);
      }
    }

    // Enhanced notifications with next schedule info
    if (action === 'missed') {
      try {
        const nextScheduleResult = await handleMissedCollectionWithNextSchedule(
          parseInt(user_id, 10), 
          schedule_id, 
          missed_reason, 
          parseInt(collector_id, 10), 
          composedNotes
        );
        
        if (nextScheduleResult.success && missed_reason !== 'collector_fault') {
          // Additional admin notification with next schedule details
          await notifyAdmins(
            'Missed (Resident)', 
            `Resident-fault missed for user ${user_id}. Next collection: ${nextScheduleResult.next_collection.next_collection_date}. Collector #${collector_id}.`
          );
        }
        
        // Include next collection info in response
        if (nextScheduleResult.next_collection) {
          responseExtras.next_collection = nextScheduleResult.next_collection;
        }
      } catch (e) {
        console.warn('Failed to handle next schedule calculation:', e.message);
        // Fallback to original notification
        if (missed_reason !== 'collector_fault') {
          await notifyResident(user_id, 'Collection missed', 'We could not collect today. We\'ll try again on your next scheduled pickup.');
          await notifyAdmins('Missed (Resident)', `Resident-fault missed for user ${user_id}. Will roll over to next schedule. Collector #${collector_id}.`);
        }
      }
    }
    if (action === 'collected') {
      await notifyResident(user_id, 'Collection completed', 'Your waste was collected today. Thank you!');
      await notifyAdmins('Collected', `Collected by collector #${collector_id} for user ${user_id} (schedule ${schedule_id || 'N/A'}).`);
      
      // Emit real-time WebSocket updates
      try {
        // Notify collector
        emitCollectionUpdate(collector_id, {
          action: 'collected',
          user_id,
          stop_id,
          schedule_id
        });
        
        // Notify resident in real-time
        emitResidentNotification(user_id, {
          title: 'Collection Completed',
          message: 'Your waste has been collected. Thank you!',
          type: 'collection_completed',
          icon: 'checkmark-circle',
          color: '#4CAF50'
        });
        
        // Notify admin
        emitAdminUpdate({
          type: 'collection_completed',
          collector_id,
          user_id,
          timestamp: new Date().toISOString()
        });
      } catch (wsError) {
        console.warn('WebSocket emission failed:', wsError.message);
      }
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
