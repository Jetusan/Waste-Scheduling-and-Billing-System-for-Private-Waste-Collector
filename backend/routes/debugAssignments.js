const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');

// GET /api/debug/assignment-check
// Checks: schedules for today, schedule_barangays links, and residents matching those barangays
router.get('/assignment-check', async (req, res) => {
  try {
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // 1) Schedules for today
    const schedulesQ = `
      SELECT cs.schedule_id, cs.waste_type, cs.time_range, cs.schedule_date
      FROM collection_schedules cs
      WHERE LOWER(cs.schedule_date) = $1
      ORDER BY cs.schedule_id
    `;
    const schedulesR = await pool.query(schedulesQ, [todayName]);
    const scheduleIds = schedulesR.rows.map(r => r.schedule_id);

    // 2) schedule_barangays links for those schedules
    let sbR = { rows: [] };
    if (scheduleIds.length > 0) {
      const sbQ = `
        SELECT sb.schedule_id, sb.barangay_id, b.barangay_name
        FROM schedule_barangays sb
        JOIN barangays b ON b.barangay_id = sb.barangay_id
        WHERE sb.schedule_id = ANY($1::int[])
        ORDER BY sb.schedule_id, sb.barangay_id
      `;
      sbR = await pool.query(sbQ, [scheduleIds]);
    }
    const barangayIds = Array.from(new Set(sbR.rows.map(r => r.barangay_id)));

    // 3) Residents (role_id=3) whose addresses are in the linked barangays
    let residentsInBarangays = [];
    let residentsWithoutAddress = [];
    let residentsWithAddressButNoBarangayMatch = [];

    if (barangayIds.length > 0) {
      const residentsQ = `
        SELECT u.user_id, u.username, u.approval_status,
               a.address_id, a.barangay_id, b.barangay_name,
               COALESCE(NULLIF(TRIM(a.full_address), ''),
                        CONCAT_WS(', ', NULLIF(TRIM(a.street), ''), NULLIF(TRIM(a.subdivision), ''), b.barangay_name, NULLIF(TRIM(a.city_municipality), ''))
               ) AS address
        FROM users u
        LEFT JOIN addresses a ON a.address_id = u.address_id
        LEFT JOIN barangays b ON b.barangay_id = a.barangay_id
        WHERE u.role_id = 3
      `;
      const allResidentsR = await pool.query(residentsQ);

      for (const r of allResidentsR.rows) {
        if (!r.address_id || r.barangay_id == null) {
          residentsWithoutAddress.push({ user_id: r.user_id, username: r.username, approval_status: r.approval_status });
        } else if (barangayIds.includes(r.barangay_id)) {
          residentsInBarangays.push({ user_id: r.user_id, username: r.username, barangay_id: r.barangay_id, barangay_name: r.barangay_name, address: r.address });
        } else {
          residentsWithAddressButNoBarangayMatch.push({ user_id: r.user_id, username: r.username, barangay_id: r.barangay_id, barangay_name: r.barangay_name });
        }
      }
    }

    return res.json({
      success: true,
      todayName,
      counts: {
        schedulesToday: schedulesR.rows.length,
        scheduleBarangayLinks: sbR.rows.length,
        uniqueBarangays: barangayIds.length,
        residentsInBarangays: residentsInBarangays.length,
        residentsWithoutAddress: residentsWithoutAddress.length,
        residentsWithAddressButNoBarangayMatch: residentsWithAddressButNoBarangayMatch.length,
      },
      samples: {
        schedulesToday: schedulesR.rows.slice(0, 10),
        scheduleBarangayLinks: sbR.rows.slice(0, 10),
        residentsInBarangays: residentsInBarangays.slice(0, 10),
        residentsWithoutAddress: residentsWithoutAddress.slice(0, 10),
        residentsWithAddressButNoBarangayMatch: residentsWithAddressButNoBarangayMatch.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('Debug assignment-check error:', err);
    return res.status(500).json({ success: false, error: 'Failed to run assignment check', message: err.message });
  }
});

module.exports = router;
