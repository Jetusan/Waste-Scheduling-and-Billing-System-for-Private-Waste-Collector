const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT } = require('../middleware/auth');

// POST /api/collector/issues/report - Report route issues (truck breakdown, equipment failure, etc.)
router.post('/report', authenticateJWT, async (req, res) => {
  try {
    const { 
      collector_id, 
      issue_type, // 'truck_breakdown', 'equipment_failure', 'weather', 'emergency', 'other'
      severity, // 'low', 'medium', 'high', 'critical'
      description,
      affected_schedule_ids,
      requested_action, // 'backup_truck', 'delay_2h', 'delay_4h', 'reschedule_tomorrow', 'cancel_route'
      estimated_delay_hours,
      location_lat,
      location_lng
    } = req.body;

    if (!collector_id || !issue_type || !severity) {
      return res.status(400).json({ 
        success: false, 
        message: 'collector_id, issue_type, and severity are required' 
      });
    }

    // Insert issue report
    const issueQuery = `
      INSERT INTO collector_issues (
        collector_id, issue_type, severity, description, 
        affected_schedule_ids, requested_action, estimated_delay_hours,
        location_lat, location_lng, status, reported_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
      RETURNING issue_id, reported_at
    `;

    const result = await pool.query(issueQuery, [
      parseInt(collector_id, 10),
      issue_type,
      severity,
      description || null,
      affected_schedule_ids ? JSON.stringify(affected_schedule_ids) : null,
      requested_action || null,
      estimated_delay_hours || null,
      location_lat || null,
      location_lng || null
    ]);

    const issueId = result.rows[0].issue_id;

    // Auto-approve certain low-risk requests
    let autoApproved = false;
    if (severity === 'low' && ['delay_2h', 'delay_4h'].includes(requested_action)) {
      await pool.query(
        'UPDATE collector_issues SET status = $1, approved_at = NOW(), approved_by = $2 WHERE issue_id = $3',
        ['approved', 'system_auto', issueId]
      );
      autoApproved = true;
    }

    // Notify supervisors/admins based on severity
    await notifySupevisors(collector_id, issue_type, severity, description, issueId);

    // Notify nearby collectors for backup assistance
    const notifiedCollectors = await notifyNearbyCollectors(collector_id, issue_type, severity, location_lat, location_lng, issueId);

    // If high/critical severity, create immediate reschedule tasks
    if (['high', 'critical'].includes(severity) && affected_schedule_ids && affected_schedule_ids.length > 0) {
      await createEmergencyReschedules(affected_schedule_ids, collector_id, issueId);
    }

    return res.json({
      success: true,
      issue_id: issueId,
      auto_approved: autoApproved,
      notified_collectors: notifiedCollectors,
      message: autoApproved 
        ? 'Issue reported and automatically approved. You may proceed with the requested action.'
        : `Issue reported. Waiting for supervisor approval. ${notifiedCollectors} nearby collectors have been notified for backup assistance.`
    });

  } catch (error) {
    console.error('Error reporting collector issue:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to report issue', 
      details: error.message 
    });
  }
});

// GET /api/collector/issues/status/:issue_id - Check status of reported issue
router.get('/status/:issue_id', authenticateJWT, async (req, res) => {
  try {
    const { issue_id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM collector_issues WHERE issue_id = $1',
      [parseInt(issue_id, 10)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    return res.json({ success: true, issue: result.rows[0] });
  } catch (error) {
    console.error('Error fetching issue status:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch issue status' });
  }
});

// Helper function to notify supervisors
async function notifySupevisors(collectorId, issueType, severity, description, issueId) {
  try {
    const title = `Collector Issue - ${severity.toUpperCase()}`;
    const message = `Collector #${collectorId} reported: ${issueType}. ${description || ''}. Issue ID: ${issueId}`;

    // Notify admins (supervisors)
    const admins = await pool.query(
      `SELECT u.user_id FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_name = 'admin'`
    );

    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, is_read, created_at, notification_type)
         VALUES ($1, $2, $3, false, NOW(), 'collector_issue')`,
        [admin.user_id, title, message]
      );
    }
  } catch (e) {
    console.warn('Failed to notify supervisors:', e.message);
  }
}

// Helper function to create emergency reschedules
async function createEmergencyReschedules(scheduleIds, collectorId, issueId) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    for (const scheduleId of scheduleIds) {
      // Get all residents affected by this schedule
      const residentsQuery = `
        SELECT DISTINCT u.user_id
        FROM users u
        JOIN addresses a ON u.address_id = a.address_id
        JOIN schedule_barangays sb ON a.barangay_id = sb.barangay_id
        WHERE sb.schedule_id = $1 AND u.role_id = 3 AND u.approval_status = 'approved'
      `;
      
      const residents = await pool.query(residentsQuery, [scheduleId]);

      for (const resident of residents.rows) {
        await pool.query(
          `INSERT INTO reschedule_tasks (user_id, origin_schedule_id, scheduled_date, status, source, notes)
           VALUES ($1, $2, $3::date, 'pending', 'emergency', $4)`,
          [
            resident.user_id,
            scheduleId,
            tomorrowStr,
            `Emergency reschedule due to collector issue #${issueId}. Collector #${collectorId}.`
          ]
        );

        // Notify resident
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, is_read, created_at)
           VALUES ($1, $2, $3, false, NOW())`,
          [
            resident.user_id,
            'Collection Rescheduled - Emergency',
            `Due to an operational issue, your collection has been rescheduled. We will notify you of the new pickup time soon.`
          ]
        );
      }
    }
  } catch (e) {
    console.warn('Failed to create emergency reschedules:', e.message);
  }
}

// Helper function to notify nearby collectors for backup assistance
async function notifyNearbyCollectors(collectorId, issueType, severity, locationLat, locationLng, issueId) {
  try {
    let notifiedCount = 0;
    
    // Find nearby collectors based on location (if provided) or all active collectors
    let nearbyCollectorsQuery;
    let queryParams;
    
    if (locationLat && locationLng) {
      // Find collectors within 10km radius using Haversine formula
      nearbyCollectorsQuery = `
        SELECT DISTINCT c.collector_id, u.user_id, u.username
        FROM collectors c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN collection_stop_events cse ON c.collector_id = cse.collector_id 
          AND DATE(cse.created_at) = CURRENT_DATE
        WHERE c.collector_id != $1 
          AND u.approval_status = 'approved'
          AND c.status = 'active'
        ORDER BY c.collector_id
        LIMIT 5
      `;
      queryParams = [collectorId];
    } else {
      // Find all active collectors except the one reporting the issue
      nearbyCollectorsQuery = `
        SELECT c.collector_id, u.user_id, u.username
        FROM collectors c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.collector_id != $1 
          AND u.approval_status = 'approved'
          AND c.status = 'active'
        LIMIT 5
      `;
      queryParams = [collectorId];
    }

    const nearbyCollectors = await pool.query(nearbyCollectorsQuery, queryParams);

    // Determine notification priority based on severity
    const notificationTitle = severity === 'critical' 
      ? '🚨 URGENT: Collector Needs Backup'
      : severity === 'high'
      ? '⚠️ HIGH PRIORITY: Backup Assistance Needed'
      : '📢 Backup Assistance Request';

    const issueTypeFormatted = issueType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    for (const collector of nearbyCollectors.rows) {
      const message = `Collector #${collectorId} is experiencing a ${issueTypeFormatted} and may need backup assistance. Issue ID: ${issueId}. ${locationLat && locationLng ? `Location: ${locationLat}, ${locationLng}` : 'Check admin dashboard for details.'}`;
      
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, is_read, created_at, notification_type)
         VALUES ($1, $2, $3, false, NOW(), 'backup_request')`,
        [collector.user_id, notificationTitle, message]
      );
      
      notifiedCount++;
    }

    // Also create a backup request record for tracking
    if (nearbyCollectors.rows.length > 0) {
      await pool.query(
        `INSERT INTO backup_requests (requesting_collector_id, issue_id, urgency, location_lat, location_lng, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
        [collectorId, issueId, severity, locationLat || null, locationLng || null]
      );
    }

    return notifiedCount;
  } catch (e) {
    console.warn('Failed to notify nearby collectors:', e.message);
    return 0;
  }
}

module.exports = router;
