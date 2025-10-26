const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT } = require('../middleware/auth');

// GET /api/collector/subdivisions/:barangay_id
// Get subdivisions for a specific barangay with collection counts
router.get('/:barangay_id', authenticateJWT, async (req, res) => {
  try {
    const { barangay_id } = req.params;
    const { collector_id } = req.query;

    console.log(`🏘️ Fetching subdivisions for barangay ${barangay_id}, collector ${collector_id}`);

    // Get subdivisions for the barangay
    const subdivisionsQuery = `
      SELECT 
        s.subdivision_id,
        s.subdivision_name,
        s.description,
        s.status,
        b.barangay_name,
        COUNT(DISTINCT u.user_id) as total_residents,
        COUNT(DISTINCT CASE WHEN cs.status IN ('active', 'pending_payment') THEN u.user_id END) as active_subscribers
      FROM subdivisions s
      LEFT JOIN barangays b ON s.barangay_id = b.barangay_id
      LEFT JOIN addresses a ON s.subdivision_id = a.subdivision_id
      LEFT JOIN users u ON a.address_id = u.address_id AND u.role_id = 3 AND u.approval_status = 'approved'
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id 
        AND cs.created_at = (
          SELECT MAX(cs2.created_at) 
          FROM customer_subscriptions cs2 
          WHERE cs2.user_id = u.user_id
        )
      WHERE s.barangay_id = $1 AND s.status = 'active'
      GROUP BY s.subdivision_id, s.subdivision_name, s.description, s.status, b.barangay_name
      ORDER BY 
        CASE WHEN LOWER(s.subdivision_name) LIKE '%vsm%' THEN 0 ELSE 1 END,
        s.subdivision_name
    `;

    const subdivisionsResult = await pool.queryWithRetry(subdivisionsQuery, [parseInt(barangay_id, 10)]);

    // Get today's collection counts per subdivision
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    
    const collectionCountsQuery = `
      SELECT 
        s.subdivision_id,
        COUNT(DISTINCT u.user_id) as collection_count
      FROM subdivisions s
      LEFT JOIN addresses a ON s.subdivision_id = a.subdivision_id
      LEFT JOIN users u ON a.address_id = u.address_id 
        AND u.role_id = 3 
        AND u.approval_status = 'approved'
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id 
        AND cs.status IN ('active', 'pending_payment')
        AND cs.created_at = (
          SELECT MAX(cs2.created_at) 
          FROM customer_subscriptions cs2 
          WHERE cs2.user_id = u.user_id
        )
      LEFT JOIN collection_schedules csch ON 1=1
      LEFT JOIN schedule_barangays sb ON csch.schedule_id = sb.schedule_id 
        AND sb.barangay_id = $1
      WHERE s.barangay_id = $1 
        AND LOWER(csch.schedule_date) = LOWER($2)
        AND cs.subscription_id IS NOT NULL
      GROUP BY s.subdivision_id
    `;

    const collectionCountsResult = await pool.queryWithRetry(collectionCountsQuery, [
      parseInt(barangay_id, 10), 
      today
    ]);

    // Build collection counts map
    const collectionCounts = {};
    collectionCountsResult.rows.forEach(row => {
      collectionCounts[row.subdivision_id] = parseInt(row.collection_count, 10);
    });

    // Add VSM Heights Phase 1 if it doesn't exist for San Isidro
    const barangayCheck = await pool.queryWithRetry(
      'SELECT barangay_name FROM barangays WHERE barangay_id = $1',
      [parseInt(barangay_id, 10)]
    );

    if (barangayCheck.rows.length > 0 && barangayCheck.rows[0].barangay_name === 'San Isidro') {
      const vsmExists = subdivisionsResult.rows.some(s => 
        s.subdivision_name && s.subdivision_name.toLowerCase().includes('vsm')
      );

      if (!vsmExists) {
        // Create VSM Heights Phase 1 subdivision if it doesn't exist
        try {
          const insertResult = await pool.queryWithRetry(`
            INSERT INTO subdivisions (subdivision_name, barangay_id, description, status)
            VALUES ('VSM Heights Phase 1', $1, 'VSM Heights Phase 1 subdivision in San Isidro', 'active')
            RETURNING subdivision_id, subdivision_name, description, status
          `, [parseInt(barangay_id, 10)]);

          if (insertResult.rows.length > 0) {
            const newSubdivision = insertResult.rows[0];
            subdivisionsResult.rows.unshift({
              ...newSubdivision,
              barangay_name: 'San Isidro',
              total_residents: 0,
              active_subscribers: 0
            });
            collectionCounts[newSubdivision.subdivision_id] = 0;
          }
        } catch (insertError) {
          console.log('VSM Heights Phase 1 subdivision may already exist:', insertError.message);
        }
      }
    }

    console.log(`📋 Found ${subdivisionsResult.rows.length} subdivisions`);
    console.log('🔢 Collection counts:', collectionCounts);

    res.json({
      success: true,
      subdivisions: subdivisionsResult.rows,
      collection_counts: collectionCounts,
      barangay_id: parseInt(barangay_id, 10),
      today: today
    });

  } catch (error) {
    console.error('Error fetching subdivisions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subdivisions',
      error: error.message
    });
  }
});

// Enhanced today's assignments endpoint with subdivision filtering
router.get('/assignments/today-subdivision', authenticateJWT, async (req, res) => {
  try {
    const { collector_id, barangay_id, subdivision } = req.query;

    if (!collector_id || !barangay_id) {
      return res.status(400).json({
        success: false,
        message: 'collector_id and barangay_id are required'
      });
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    
    console.log(`🕐 Looking for ${today} collections in subdivision ${subdivision || 'ALL'} of barangay ${barangay_id}`);

    // Check if there are collection schedules for today
    let scheduleQuery = `
      SELECT DISTINCT
        cs.schedule_id,
        cs.schedule_date,
        cs.waste_type,
        cs.time_range,
        cs.subdivision as schedule_subdivision,
        b.barangay_id,
        b.barangay_name
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      WHERE LOWER(cs.schedule_date) = LOWER($1)
        AND b.barangay_id = $2
    `;
    
    const scheduleParams = [today, parseInt(barangay_id, 10)];
    
    // Add subdivision filter if specified
    if (subdivision && subdivision !== 'null' && subdivision !== 'undefined') {
      scheduleQuery += ` AND (cs.subdivision IS NULL OR LOWER(cs.subdivision) = LOWER($${scheduleParams.length + 1}))`;
      scheduleParams.push(subdivision);
    }
    
    scheduleQuery += ` ORDER BY cs.schedule_id`;

    const schedulesResult = await pool.queryWithRetry(scheduleQuery, scheduleParams);
    
    if (schedulesResult.rows.length === 0) {
      return res.json({ 
        assignment: null,
        stops: [],
        message: `No collection schedules for ${today}${subdivision ? ` in ${subdivision}` : ''}`
      });
    }

    // Get residents with active subscriptions in the specified subdivision
    let residentsQuery = `
      SELECT DISTINCT
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, 'Unknown Resident') AS resident_name,
        COALESCE(
          a.full_address,
          CONCAT_WS(', ', 
            NULLIF(TRIM(a.street), ''), 
            NULLIF(TRIM(a.subdivision), ''), 
            NULLIF(TRIM(a.block), ''), 
            NULLIF(TRIM(a.lot), ''), 
            b.barangay_name
          )
        ) AS address,
        a.subdivision,
        a.block,
        a.lot,
        b.barangay_id,
        b.barangay_name,
        s.subdivision_name,
        cs.status as subscription_status,
        cs.subscription_id
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN subdivisions s ON a.subdivision_id = s.subdivision_id
      JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND u.user_id IS NOT NULL
        AND cs.status IN ('active', 'pending_payment')
        AND b.barangay_id = $1
        AND cs.created_at = (
          SELECT MAX(cs2.created_at) 
          FROM customer_subscriptions cs2 
          WHERE cs2.user_id = u.user_id
        )
    `;
    
    const queryParams = [parseInt(barangay_id, 10)];
    
    // Add subdivision filter if specified
    if (subdivision && subdivision !== 'null' && subdivision !== 'undefined') {
      residentsQuery += ` AND (a.subdivision = $${queryParams.length + 1} OR s.subdivision_name = $${queryParams.length + 1})`;
      queryParams.push(subdivision);
    }
    
    residentsQuery += ` ORDER BY a.subdivision, a.block, a.lot, u.user_id LIMIT 100`;

    const residentsResult = await pool.queryWithRetry(residentsQuery, queryParams);
    
    if (residentsResult.rows.length === 0) {
      return res.json({ 
        assignment: null, 
        stops: [],
        message: `No residents with active subscriptions found${subdivision ? ` in ${subdivision}` : ''}`
      });
    }

    // Build stops from residents
    const stops = [];
    let stopCounter = 1;
    const primarySchedule = schedulesResult.rows[0];
    
    for (const resident of residentsResult.rows) {
      const residentSchedule = schedulesResult.rows.find(s => s.barangay_id === resident.barangay_id) || primarySchedule;
      
      const stopId = `${today.toLowerCase()}-${residentSchedule.waste_type.toLowerCase()}-${resident.user_id}`;
      
      stops.push({
        stop_id: stopId,
        sequence_no: stopCounter++,
        user_id: resident.user_id,
        resident_name: resident.resident_name,
        address: resident.address,
        subdivision: resident.subdivision || resident.subdivision_name,
        block: resident.block,
        lot: resident.lot,
        barangay_id: resident.barangay_id,
        barangay_name: resident.barangay_name,
        planned_waste_type: residentSchedule.waste_type,
        schedule_id: residentSchedule.schedule_id,
        time_range: residentSchedule.time_range,
        latest_action: null,
        latest_updated_at: null,
        subscription_status: resident.subscription_status,
        subscription_id: resident.subscription_id
      });
    }

    // Build assignment object
    const assignment = {
      schedule_id: primarySchedule.schedule_id,
      waste_type: primarySchedule.waste_type,
      time_range: primarySchedule.time_range,
      date_label: today,
      schedule_date: today,
      subdivision: subdivision,
      barangay_id: parseInt(barangay_id, 10),
      barangay_name: schedulesResult.rows[0].barangay_name
    };

    console.log(`📋 Returning ${stops.length} stops for ${subdivision || 'general'} collection`);

    return res.json({ 
      success: true,
      assignment, 
      stops 
    });

  } catch (error) {
    console.error('Error fetching subdivision assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subdivision assignments',
      error: error.message
    });
  }
});

module.exports = router;
