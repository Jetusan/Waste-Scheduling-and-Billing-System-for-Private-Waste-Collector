const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');

// GET /api/collection-schedules - Get all collection schedules
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        cs.schedule_id,
        cs.schedule_date,
        cs.created_at,
        cs.waste_type,
        cs.time_range,
        array_agg(
          json_build_object(
            'barangay_id', b.barangay_id,
            'barangay_name', b.barangay_name
          )
        ) as barangays
      FROM collection_schedules cs
      LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
      GROUP BY cs.schedule_id, cs.schedule_date, cs.created_at, cs.waste_type, cs.time_range
      ORDER BY cs.schedule_date
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching collection schedules:', error);
    res.status(500).json({ 
      error: 'Failed to fetch collection schedules',
      message: error.message 
    });
  }
});

// POST /api/collection-schedules - Create a new collection schedule
router.post('/', async (req, res) => {
  try {
    console.log('Creating new collection schedule:', req.body);
    const { schedule_date, waste_type, time_range, barangay_ids } = req.body;

    // Validation
    if (!schedule_date || !waste_type || !time_range || !barangay_ids || barangay_ids.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'schedule_date, waste_type, time_range, and barangay_ids are required'
      });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert into collection_schedules
      const scheduleQuery = `
        INSERT INTO collection_schedules (schedule_date, waste_type, time_range, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING schedule_id
      `;
      const scheduleResult = await client.query(scheduleQuery, [schedule_date, waste_type, time_range]);
      const scheduleId = scheduleResult.rows[0].schedule_id;

      // Insert into schedule_barangays for each selected barangay
      for (const barangayId of barangay_ids) {
        const barangayQuery = `
          INSERT INTO schedule_barangays (schedule_id, barangay_id)
          VALUES ($1, $2)
        `;
        await client.query(barangayQuery, [scheduleId, barangayId]);
      }

      await client.query('COMMIT');

      // Return the created schedule with barangay details
      const getScheduleQuery = `
        SELECT 
          cs.schedule_id,
          cs.schedule_date,
          cs.created_at,
          cs.waste_type,
          cs.time_range,
          array_agg(
            json_build_object(
              'barangay_id', b.barangay_id,
              'barangay_name', b.barangay_name
            )
          ) as barangays
        FROM collection_schedules cs
        LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
        LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
        WHERE cs.schedule_id = $1
        GROUP BY cs.schedule_id, cs.schedule_date, cs.created_at, cs.waste_type, cs.time_range
      `;
      
      const newSchedule = await client.query(getScheduleQuery, [scheduleId]);
      
      res.status(201).json({
        message: 'Collection schedule created successfully',
        schedule: newSchedule.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating collection schedule:', error);
    res.status(500).json({ 
      error: 'Failed to create collection schedule',
      message: error.message 
    });
  }
});

module.exports = router;
