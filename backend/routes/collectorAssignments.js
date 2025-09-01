const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');

// GET /api/collector/assignments/today?collector_id=123
// Returns a lightweight assignment object and a list of resident stops for barangays scheduled today.
router.get('/today', async (req, res) => {
  try {
    const { collector_id } = req.query;

    // Compute today's weekday name (e.g., 'Wednesday') to match stored schedule_date
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    console.log(`Looking for schedules on: ${todayName} (collector_id: ${collector_id})`);

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
        ) AS address
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      JOIN users u ON u.role_id = 3 AND u.address_id IS NOT NULL AND u.approval_status = 'approved'
      JOIN addresses a ON a.address_id = u.address_id AND a.barangay_id = b.barangay_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE cs.schedule_date = $1
      ORDER BY b.barangay_name, a.street NULLS LAST, u.user_id
    `;

    const result = await pool.query(q, [todayName]);
    console.log(`Found ${result.rows.length} stops for ${todayName}`);

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
