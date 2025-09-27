const { query } = require('../config/db');
const { 
  notifyResidentMissedCollection,
  notifyCollectorCatchupScheduled,
  notifyAdminMissedCollectionTrends
} = require('../services/enhancedMissedCollectionNotificationService');

// Enhanced missed collection handler with dynamic issue reporting
const reportEnhancedMissedCollection = async (req, res) => {
  try {
    console.log('📥 Enhanced missed collection request body:', req.body);
    
    let {
      stop_id,
      schedule_id,
      user_id,
      collector_id,
      fault_type,
      issue_type,
      issue_description,
      severity,
      estimated_delay_days,
      additional_notes
    } = req.body;

    // Parse stop_id if it comes as a string with hyphen
    if (typeof stop_id === 'string' && stop_id.includes('-')) {
      const parts = stop_id.split('-');
      stop_id = parseInt(parts[0]);
      console.log('🔧 Parsed stop_id:', stop_id);
    } else if (stop_id) {
      stop_id = parseInt(stop_id);
    }

    // Parse schedule_id if it's a string
    if (schedule_id) {
      schedule_id = parseInt(schedule_id);
    }

    // Parse user_id and collector_id if they come as strings
    if (typeof user_id === 'string' && user_id.includes('-')) {
      const parts = user_id.split('-');
      user_id = parseInt(parts[0]);
      collector_id = parseInt(parts[1]);
      console.log('🔧 Parsed user_id:', user_id, 'collector_id:', collector_id);
    } else {
      user_id = parseInt(user_id);
      collector_id = parseInt(collector_id);
    }

    // Validate required fields
    if (!user_id || !collector_id || !fault_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, collector_id, fault_type'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // 1. Record the missed collection with enhanced details
      const missedCollectionQuery = `
        INSERT INTO missed_collections (
          stop_id, schedule_id, user_id, collector_id, 
          fault_type, issue_type, issue_description, 
          severity, estimated_delay_days, additional_notes,
          reported_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'reported')
        RETURNING missed_collection_id, reported_at
      `;
      
      const missedResult = await query(missedCollectionQuery, [
        stop_id, schedule_id, user_id, collector_id,
        fault_type, issue_type, issue_description,
        severity, estimated_delay_days || 1, additional_notes
      ]);

      const missedCollectionId = missedResult.rows[0].missed_collection_id;
      const reportedAt = missedResult.rows[0].reported_at;

      let catchupDate = null;
      let catchupTaskId = null;
      let scheduledCatchup = null;
      let notificationMessage = '';

      // 2. Handle different fault types
      if (fault_type === 'collector_fault') {
        // Calculate catch-up date based on estimated delay
        const delayDays = estimated_delay_days || getDefaultDelayForIssue(issue_type);
        catchupDate = new Date();
        catchupDate.setDate(catchupDate.getDate() + delayDays);

        // Create catch-up task
        const catchupQuery = `
          INSERT INTO catchup_tasks (
            missed_collection_id, user_id, collector_id,
            scheduled_date, priority, status, issue_type,
            created_at, notes
          ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), $7)
          RETURNING task_id
        `;

        const priority = getSeverityPriority(severity);
        const catchupResult = await query(catchupQuery, [
          missedCollectionId, user_id, collector_id,
          catchupDate.toISOString().split('T')[0],
          priority, issue_type,
          `Auto-scheduled catch-up for ${issue_description || issue_type}`
        ]);

        catchupTaskId = catchupResult.rows[0].task_id;
        scheduledCatchup = catchupDate.toISOString().split('T')[0];

        // 5. Send notifications
        try {
          // Get resident and collector details for notifications
          const residentQuery = `
            SELECT u.full_name, a.street, b.barangay_name 
            FROM users u 
            JOIN addresses a ON u.address_id = a.address_id 
            JOIN barangays b ON a.barangay_id = b.barangay_id 
            WHERE u.user_id = $1
          `;
          const residentResult = await query(residentQuery, [user_id]);
          const residentData = residentResult.rows[0] || {};

          // Notify resident about missed collection
          await notifyResidentMissedCollection(user_id, {
            fault_type,
            issue_description,
            severity,
            estimated_delay_days,
            catchup_date: scheduledCatchup
          });

          // Notify collector about catch-up task if scheduled
          if (catchupTaskId) {
            await notifyCollectorCatchupScheduled(collector_id, {
              resident_name: residentData.full_name || 'Unknown Resident',
              address: `${residentData.street || ''}, ${residentData.barangay_name || ''}`.trim(),
              issue_description,
              scheduled_date: scheduledCatchup,
              priority: priority
            });
          }

          // Send admin analytics notification for high severity or multiple issues
          if (severity === 'high') {
            // Get daily stats for admin notification
            const dailyStatsQuery = `
              SELECT 
                COUNT(*) as total_missed_today,
                COUNT(*) FILTER (WHERE fault_type = 'collector_fault') as collector_faults,
                COUNT(*) FILTER (WHERE fault_type = 'resident_fault') as resident_faults,
                COUNT(*) FILTER (WHERE severity = 'high') as high_severity_count
              FROM missed_collections 
              WHERE DATE(created_at) = CURRENT_DATE
            `;
            const statsResult = await query(dailyStatsQuery);
            const stats = statsResult.rows[0] || {};

            const pendingCatchupsQuery = `
              SELECT COUNT(*) as pending_catchups 
              FROM catchup_tasks 
              WHERE status = 'pending'
            `;
            const pendingResult = await query(pendingCatchupsQuery);
            
            await notifyAdminMissedCollectionTrends({
              ...stats,
              pending_catchups: pendingResult.rows[0]?.pending_catchups || 0
            });
          }

          notificationMessage = 'Notifications sent successfully';
        } catch (notificationError) {
          console.error('❌ Notification error:', notificationError);
          notificationMessage = 'Collection logged but notification failed';
        }

      } else if (fault_type === 'resident_fault') {
        // For resident fault, just roll over to next regular schedule
        notificationMessage = 'Missed collection due to resident unavailability. Will roll over to next regular schedule.';
      }

      // 3. Log collection action (collection_stops table doesn't exist, so we skip this update)
      // The missed collection is already recorded in missed_collections table

      // 4. Log the action for audit trail
      await query(`
        INSERT INTO collection_actions (
          user_id, collector_id, action_type, 
          details, timestamp
        ) VALUES ($1, $2, 'missed_collection', $3, NOW())
      `, [
        user_id, collector_id,
        JSON.stringify({
          fault_type,
          issue_type,
          issue_description,
          severity,
          estimated_delay_days,
          catchup_date: catchupDate?.toISOString()
        })
      ]);

      await query('COMMIT');

      res.json({
        success: true,
        message: 'Enhanced missed collection reported successfully',
        data: {
          missed_collection_id: missedCollectionId,
          catchup_task_id: catchupTaskId,
          reported_at: reportedAt,
          scheduled_catchup: scheduledCatchup
        },
        navigation: {
          action: 'move_to_next_pickup',
          message: 'Moving to next pickup location...'
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error reporting enhanced missed collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report missed collection'
    });
  }
};

// Get collector's catch-up tasks
const getCollectorCatchupTasks = async (req, res) => {
  try {
    const { collector_id } = req.query;
    
    if (!collector_id) {
      return res.status(400).json({
        success: false,
        error: 'Collector ID is required'
      });
    }

    const catchupQuery = `
      SELECT 
        ct.task_id,
        ct.scheduled_date,
        ct.priority,
        ct.status,
        ct.issue_type,
        ct.notes,
        mc.issue_description,
        mc.fault_type,
        mc.severity,
        u.username,
        un.first_name,
        un.last_name,
        a.street,
        b.barangay_name as barangay
      FROM catchup_tasks ct
      JOIN missed_collections mc ON ct.missed_collection_id = mc.missed_collection_id
      JOIN users u ON ct.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE ct.collector_id = $1 
        AND ct.status IN ('pending', 'in_progress')
        AND ct.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY ct.priority DESC, ct.scheduled_date ASC
    `;

    const result = await query(catchupQuery, [collector_id]);

    const formattedTasks = result.rows.map(task => ({
      task_id: task.task_id,
      scheduled_date: task.scheduled_date,
      priority: task.priority,
      status: task.status,
      issue_type: task.issue_type,
      notes: task.notes,
      issue_description: task.issue_description,
      fault_type: task.fault_type,
      severity: task.severity,
      resident: {
        username: task.username,
        name: `${task.first_name || ''} ${task.last_name || ''}`.trim(),
        address: {
          street: task.street,
          barangay: task.barangay
        }
      },
      is_overdue: new Date(task.scheduled_date) < new Date(),
      days_until_due: Math.ceil((new Date(task.scheduled_date) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      tasks: formattedTasks,
      total_pending: formattedTasks.filter(t => t.status === 'pending').length,
      overdue_count: formattedTasks.filter(t => t.is_overdue).length
    });

  } catch (error) {
    console.error('Error fetching catchup tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch catchup tasks'
    });
  }
};

// Complete a catch-up task
const completeCatchupTask = async (req, res) => {
  try {
    const { task_id, collector_id, completion_notes } = req.body;

    if (!task_id || !collector_id) {
      return res.status(400).json({
        success: false,
        error: 'Task ID and Collector ID are required'
      });
    }

    await query('BEGIN');

    try {
      // Update catch-up task status
      const updateResult = await query(`
        UPDATE catchup_tasks 
        SET status = 'completed',
            completed_at = NOW(),
            completion_notes = $1
        WHERE task_id = $2 AND collector_id = $3
        RETURNING user_id, missed_collection_id
      `, [completion_notes, task_id, collector_id]);

      if (updateResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Catch-up task not found'
        });
      }

      const { user_id, missed_collection_id } = updateResult.rows[0];

      // Update missed collection status
      await query(`
        UPDATE missed_collections 
        SET status = 'resolved',
            resolved_at = NOW()
        WHERE missed_collection_id = $1
      `, [missed_collection_id]);

      // Log completion action
      await query(`
        INSERT INTO collection_actions (
          user_id, collector_id, action_type, 
          details, timestamp
        ) VALUES ($1, $2, 'catchup_completed', $3, NOW())
      `, [
        user_id, collector_id,
        JSON.stringify({ task_id, completion_notes })
      ]);

      // Send completion notification - get collector's user_id first
      const collectorUserQuery = `SELECT user_id FROM collectors WHERE collector_id = $1`;
      const collectorUserResult = await query(collectorUserQuery, [collector_id]);
      
      if (collectorUserResult.rows.length > 0) {
        const collectorUserId = collectorUserResult.rows[0].user_id;
        await createUserNotification(
          collectorUserId,
          'Catch-up Completed',
          `Catch-up task completed for ${resident.name}. Status: ${status}`,
          'catchup_completed'
        );
      }

      await query('COMMIT');

      res.json({
        success: true,
        message: 'Catch-up task completed successfully'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error completing catchup task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete catch-up task'
    });
  }
};

// Get missed collection analytics for admin
const getMissedCollectionAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, collector_id } = req.query;

    let whereClause = 'WHERE mc.reported_at >= $1 AND mc.reported_at <= $2';
    let params = [start_date || '2024-01-01', end_date || new Date().toISOString()];

    if (collector_id) {
      whereClause += ' AND mc.collector_id = $3';
      params.push(collector_id);
    }

    const analyticsQuery = `
      SELECT 
        mc.fault_type,
        mc.issue_type,
        mc.severity,
        COUNT(*) as count,
        AVG(mc.estimated_delay_days) as avg_delay,
        COUNT(CASE WHEN mc.status = 'resolved' THEN 1 END) as resolved_count
      FROM missed_collections mc
      ${whereClause}
      GROUP BY mc.fault_type, mc.issue_type, mc.severity
      ORDER BY count DESC
    `;

    const result = await query(analyticsQuery, params);

    const analytics = {
      total_missed: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      by_fault_type: {},
      by_issue_type: {},
      by_severity: {},
      resolution_rate: 0
    };

    let totalResolved = 0;

    result.rows.forEach(row => {
      // Group by fault type
      if (!analytics.by_fault_type[row.fault_type]) {
        analytics.by_fault_type[row.fault_type] = 0;
      }
      analytics.by_fault_type[row.fault_type] += parseInt(row.count);

      // Group by issue type
      if (row.issue_type) {
        if (!analytics.by_issue_type[row.issue_type]) {
          analytics.by_issue_type[row.issue_type] = 0;
        }
        analytics.by_issue_type[row.issue_type] += parseInt(row.count);
      }

      // Group by severity
      if (!analytics.by_severity[row.severity]) {
        analytics.by_severity[row.severity] = 0;
      }
      analytics.by_severity[row.severity] += parseInt(row.count);

      totalResolved += parseInt(row.resolved_count);
    });

    analytics.resolution_rate = analytics.total_missed > 0 
      ? Math.round((totalResolved / analytics.total_missed) * 100) 
      : 0;

    res.json({
      success: true,
      analytics,
      period: {
        start_date: params[0],
        end_date: params[1]
      }
    });

  } catch (error) {
    console.error('Error fetching missed collection analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
};

// Helper functions
function getDefaultDelayForIssue(issueType) {
  const delays = {
    'truck_breakdown': 3,
    'equipment_failure': 1,
    'route_blocked': 2,
    'traffic_delay': 1,
    'weather_conditions': 1,
    'collector_emergency': 2,
    'fuel_shortage': 1,
    'safety_concern': 1,
    'custom': 1
  };
  return delays[issueType] || 1;
}

function getSeverityPriority(severity) {
  const priorities = {
    'high': 3,
    'medium': 2,
    'low': 1
  };
  return priorities[severity] || 1;
}

module.exports = {
  reportEnhancedMissedCollection,
  getCollectorCatchupTasks,
  completeCatchupTask,
  getMissedCollectionAnalytics
};
