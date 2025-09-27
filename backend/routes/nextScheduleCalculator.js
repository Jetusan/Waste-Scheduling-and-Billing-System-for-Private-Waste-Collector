const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');

// Helper function to calculate next collection date for a resident
async function calculateNextCollectionDate(userId, missedScheduleId) {
  try {
    // Get the resident's barangay
    const residentQuery = `
      SELECT a.barangay_id, b.barangay_name
      FROM users u
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.user_id = $1
    `;
    const residentResult = await pool.query(residentQuery, [userId]);
    
    if (residentResult.rows.length === 0) {
      throw new Error('Resident not found or no address assigned');
    }

    const { barangay_id, barangay_name } = residentResult.rows[0];

    // Get the missed schedule details
    const missedScheduleQuery = `
      SELECT schedule_date, waste_type, time_range
      FROM collection_schedules
      WHERE schedule_id = $1
    `;
    const missedScheduleResult = await pool.query(missedScheduleQuery, [missedScheduleId]);
    
    if (missedScheduleResult.rows.length === 0) {
      throw new Error('Missed schedule not found');
    }

    const { schedule_date, waste_type, time_range } = missedScheduleResult.rows[0];

    // Find the next available schedule for this barangay with the same waste type
    const nextScheduleQuery = `
      SELECT cs.schedule_id, cs.schedule_date, cs.waste_type, cs.time_range
      FROM collection_schedules cs
      JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      WHERE sb.barangay_id = $1 
        AND cs.waste_type = $2
        AND (
          -- If schedule_date is a weekday name, find next occurrence
          (cs.schedule_date ~ '^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$' 
           AND cs.schedule_date = $3)
          OR
          -- If schedule_date is a future date
          (cs.schedule_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' 
           AND cs.schedule_date::date > CURRENT_DATE)
        )
      ORDER BY 
        CASE 
          WHEN cs.schedule_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' 
          THEN cs.schedule_date::date
          ELSE CURRENT_DATE + (
            CASE cs.schedule_date
              WHEN 'Monday' THEN (1 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'Tuesday' THEN (2 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'Wednesday' THEN (3 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'Thursday' THEN (4 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'Friday' THEN (5 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'Saturday' THEN (6 - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7
              WHEN 'Sunday' THEN (7 - EXTRACT(DOW FROM CURRENT_DATE)) % 7
              ELSE 7
            END
          )::integer
        END
      LIMIT 1
    `;

    const nextScheduleResult = await pool.query(nextScheduleQuery, [barangay_id, waste_type, schedule_date]);

    if (nextScheduleResult.rows.length === 0) {
      // No regular schedule found, calculate next week's occurrence
      const nextWeekDate = new Date();
      const daysToAdd = getDaysUntilNextWeekday(schedule_date);
      nextWeekDate.setDate(nextWeekDate.getDate() + daysToAdd);
      
      return {
        next_collection_date: nextWeekDate.toISOString().split('T')[0],
        next_schedule_id: null,
        schedule_type: 'calculated',
        waste_type,
        time_range,
        barangay_name,
        message: `Next ${waste_type} collection scheduled for ${schedule_date}, ${nextWeekDate.toLocaleDateString()}`
      };
    }

    const nextSchedule = nextScheduleResult.rows[0];
    let nextDate;

    if (nextSchedule.schedule_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Specific date
      nextDate = nextSchedule.schedule_date;
    } else {
      // Weekday name - calculate next occurrence
      const daysToAdd = getDaysUntilNextWeekday(nextSchedule.schedule_date);
      const calculatedDate = new Date();
      calculatedDate.setDate(calculatedDate.getDate() + daysToAdd);
      nextDate = calculatedDate.toISOString().split('T')[0];
    }

    return {
      next_collection_date: nextDate,
      next_schedule_id: nextSchedule.schedule_id,
      schedule_type: 'regular',
      waste_type: nextSchedule.waste_type,
      time_range: nextSchedule.time_range,
      barangay_name,
      message: `Next collection: ${nextSchedule.waste_type} on ${nextSchedule.schedule_date} (${nextDate})`
    };

  } catch (error) {
    console.error('Error calculating next collection date:', error);
    throw error;
  }
}

// Helper function to get days until next weekday
function getDaysUntilNextWeekday(weekdayName) {
  const weekdays = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  
  const today = new Date();
  const currentDay = today.getDay();
  const targetDay = weekdays[weekdayName];
  
  if (targetDay === undefined) return 7; // Default to next week
  
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7; // Next week if today or past
  
  return daysUntil;
}

// API endpoint to get next collection date for a resident
router.get('/next-collection/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { missed_schedule_id } = req.query;

    if (!missed_schedule_id) {
      return res.status(400).json({
        success: false,
        message: 'missed_schedule_id is required'
      });
    }

    const nextCollection = await calculateNextCollectionDate(
      parseInt(user_id, 10),
      parseInt(missed_schedule_id, 10)
    );

    return res.json({
      success: true,
      ...nextCollection
    });

  } catch (error) {
    console.error('Error getting next collection date:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate next collection date',
      details: error.message
    });
  }
});

// Enhanced function to handle missed collections with automatic next schedule assignment
async function handleMissedCollectionWithNextSchedule(userId, scheduleId, missedReason, collectorId, notes) {
  try {
    // Calculate next collection date
    const nextCollection = await calculateNextCollectionDate(userId, scheduleId);

    // Create notification message based on missed reason
    let notificationTitle, notificationMessage;

    if (missedReason === 'collector_fault') {
      // Create catch-up task (existing logic)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      await pool.query(
        `INSERT INTO reschedule_tasks (user_id, origin_schedule_id, scheduled_date, status, source, notes)
         VALUES ($1, $2, $3::date, 'pending', 'missed', $4)`,
        [userId, scheduleId, tomorrowStr, `Auto catch-up from missed (collector fault). ${notes || ''}`.trim()]
      );

      notificationTitle = 'Collection missed — catch-up scheduled';
      notificationMessage = `We missed your collection today due to an operational issue. A catch-up collection is scheduled for tomorrow. Your next regular collection is on ${nextCollection.next_collection_date}.`;
    } else {
      // Resident fault - roll over to next regular schedule
      notificationTitle = 'Collection missed — next pickup scheduled';
      notificationMessage = `We could not collect today. ${nextCollection.message}. Please ensure your waste is ready for collection.`;
    }

    // Insert notification with next schedule info
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at, notification_type)
       VALUES ($1, $2, $3, false, NOW(), 'collection_missed')`,
      [userId, notificationTitle, notificationMessage]
    );

    // Store next schedule info in a tracking table
    await pool.query(
      `INSERT INTO resident_next_collections (
        user_id, missed_schedule_id, next_collection_date, next_schedule_id, 
        schedule_type, waste_type, time_range, barangay_name, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id, missed_schedule_id) 
      DO UPDATE SET
        next_collection_date = EXCLUDED.next_collection_date,
        next_schedule_id = EXCLUDED.next_schedule_id,
        schedule_type = EXCLUDED.schedule_type,
        updated_at = NOW()`,
      [
        userId, scheduleId, nextCollection.next_collection_date,
        nextCollection.next_schedule_id, nextCollection.schedule_type,
        nextCollection.waste_type, nextCollection.time_range,
        nextCollection.barangay_name
      ]
    );

    return {
      success: true,
      next_collection: nextCollection,
      notification_sent: true
    };

  } catch (error) {
    console.error('Error handling missed collection with next schedule:', error);
    throw error;
  }
}

module.exports = {
  router,
  calculateNextCollectionDate,
  handleMissedCollectionWithNextSchedule
};
