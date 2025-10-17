const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT } = require('../middleware/auth');

// Enhanced collection schedules endpoint - merges current and upcoming
// GET /api/enhanced-schedules?user_barangay=X&view=upcoming|current|all
router.get('/', async (req, res) => {
  try {
    const { user_barangay, view = 'upcoming' } = req.query;
    
    // Get current day name
    const today = new Date();
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    
    console.log(`📅 Fetching ${view} schedules for barangay: ${user_barangay || 'all'}, today: ${todayName}`);

    let scheduleQuery = `
      SELECT DISTINCT
        cs.schedule_id,
        cs.schedule_date,
        cs.waste_type,
        cs.time_range,
        cs.created_at,
        array_agg(
          DISTINCT jsonb_build_object(
            'barangay_id', b.barangay_id,
            'barangay_name', b.barangay_name
          )
        ) as barangays,
        CASE 
          WHEN LOWER(cs.schedule_date) = LOWER($1) THEN 'current'
          ELSE 'upcoming'
        END as schedule_status,
        -- Calculate days until collection
        CASE 
          WHEN LOWER(cs.schedule_date) = LOWER($1) THEN 0
          ELSE 
            CASE LOWER(cs.schedule_date)
              WHEN 'monday' THEN (1 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'tuesday' THEN (2 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'wednesday' THEN (3 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'thursday' THEN (4 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'friday' THEN (5 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'saturday' THEN (6 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'sunday' THEN (0 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              ELSE 7
            END
        END as days_until_collection
      FROM collection_schedules cs
      LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
    `;
    
    const queryParams = [todayName];
    let whereConditions = [];
    
    // Filter by user's barangay if provided
    if (user_barangay) {
      whereConditions.push(`b.barangay_name ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${user_barangay}%`);
    }
    
    // Filter by view type
    if (view === 'current') {
      whereConditions.push(`LOWER(cs.schedule_date) = LOWER($1)`);
    } else if (view === 'upcoming') {
      whereConditions.push(`LOWER(cs.schedule_date) != LOWER($1)`);
    }
    // 'all' view shows everything
    
    if (whereConditions.length > 0) {
      scheduleQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    scheduleQuery += `
      GROUP BY cs.schedule_id, cs.schedule_date, cs.waste_type, cs.time_range, cs.created_at
      ORDER BY 
        CASE 
          WHEN LOWER(cs.schedule_date) = LOWER($1) THEN 0
          ELSE 
            CASE LOWER(cs.schedule_date)
              WHEN 'monday' THEN 1
              WHEN 'tuesday' THEN 2
              WHEN 'wednesday' THEN 3
              WHEN 'thursday' THEN 4
              WHEN 'friday' THEN 5
              WHEN 'saturday' THEN 6
              WHEN 'sunday' THEN 7
              ELSE 8
            END
        END,
        cs.time_range
    `;
    
    const result = await pool.queryWithRetry(scheduleQuery, queryParams);
    
    // Process results to add helpful information
    const processedSchedules = result.rows.map(schedule => ({
      ...schedule,
      is_today: schedule.schedule_status === 'current',
      next_collection_text: schedule.days_until_collection === 0 
        ? 'Today' 
        : schedule.days_until_collection === 1 
        ? 'Tomorrow'
        : `In ${schedule.days_until_collection} days`,
      user_barangay_included: user_barangay 
        ? schedule.barangays.some(b => 
            b.barangay_name && b.barangay_name.toLowerCase().includes(user_barangay.toLowerCase())
          )
        : true
    }));
    
    // Separate current and upcoming for summary
    const currentSchedules = processedSchedules.filter(s => s.schedule_status === 'current');
    const upcomingSchedules = processedSchedules.filter(s => s.schedule_status === 'upcoming');
    
    console.log(`📊 Found ${currentSchedules.length} current, ${upcomingSchedules.length} upcoming schedules`);
    
    res.json({
      success: true,
      view: view,
      today: todayName,
      user_barangay: user_barangay || null,
      summary: {
        total: processedSchedules.length,
        current: currentSchedules.length,
        upcoming: upcomingSchedules.length
      },
      schedules: processedSchedules,
      current_schedules: currentSchedules,
      upcoming_schedules: upcomingSchedules
    });
    
  } catch (error) {
    console.error('Error fetching enhanced schedules:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch collection schedules',
      message: error.message 
    });
  }
});

// Get user's next collection info
// GET /api/enhanced-schedules/next-collection?user_barangay=X
router.get('/next-collection', authenticateJWT, async (req, res) => {
  try {
    const { user_barangay } = req.query;
    
    if (!user_barangay) {
      return res.status(400).json({
        success: false,
        message: 'user_barangay parameter is required'
      });
    }
    
    const today = new Date();
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    
    // Find the next collection for user's barangay
    const nextCollectionQuery = `
      SELECT 
        cs.schedule_id,
        cs.schedule_date,
        cs.waste_type,
        cs.time_range,
        b.barangay_name,
        CASE 
          WHEN LOWER(cs.schedule_date) = LOWER($1) THEN 0
          ELSE 
            CASE LOWER(cs.schedule_date)
              WHEN 'monday' THEN (1 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'tuesday' THEN (2 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'wednesday' THEN (3 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'thursday' THEN (4 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'friday' THEN (5 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'saturday' THEN (6 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'sunday' THEN (0 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              ELSE 7
            END
        END as days_until_collection
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      JOIN barangays b ON sb.barangay_id = b.barangay_id
      WHERE b.barangay_name ILIKE $2
      ORDER BY days_until_collection ASC, cs.time_range ASC
      LIMIT 1
    `;
    
    const result = await pool.queryWithRetry(nextCollectionQuery, [todayName, `%${user_barangay}%`]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        next_collection: null,
        message: 'No upcoming collections found for your barangay'
      });
    }
    
    const nextCollection = result.rows[0];
    
    res.json({
      success: true,
      next_collection: {
        ...nextCollection,
        is_today: nextCollection.days_until_collection === 0,
        collection_text: nextCollection.days_until_collection === 0 
          ? 'Today' 
          : nextCollection.days_until_collection === 1 
          ? 'Tomorrow'
          : `In ${nextCollection.days_until_collection} days`,
        formatted_date: nextCollection.schedule_date
      }
    });
    
  } catch (error) {
    console.error('Error fetching next collection:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch next collection',
      message: error.message 
    });
  }
});

module.exports = router;
