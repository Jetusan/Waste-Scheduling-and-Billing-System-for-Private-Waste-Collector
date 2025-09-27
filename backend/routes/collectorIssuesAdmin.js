const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// GET /api/collector/issues/list - Admin only: Get all collector issues
router.get('/list', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, severity, collector_id } = req.query;
    const params = [];
    const wheres = [];

    if (status) {
      params.push(status);
      wheres.push(`status = $${params.length}`);
    }
    if (severity) {
      params.push(severity);
      wheres.push(`severity = $${params.length}`);
    }
    if (collector_id) {
      params.push(parseInt(collector_id, 10));
      wheres.push(`collector_id = $${params.length}`);
    }

    const query = `
      SELECT 
        issue_id, collector_id, issue_type, severity, description,
        affected_schedule_ids, requested_action, estimated_delay_hours,
        location_lat, location_lng, status, reported_at, approved_at,
        approved_by, resolved_at, resolution_notes
      FROM collector_issues
      ${wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''}
      ORDER BY 
        CASE status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'rejected' THEN 3 
          WHEN 'resolved' THEN 4 
          ELSE 5 
        END,
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 
        END,
        reported_at DESC
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, issues: result.rows });

  } catch (error) {
    console.error('Error fetching collector issues:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch issues', 
      details: error.message 
    });
  }
});

// POST /api/collector/issues/:issue_id/approve - Admin only: Approve issue request
router.post('/:issue_id/approve', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { resolution_notes } = req.body;
    const approvedBy = req.user?.userId || 'admin';

    // Update issue status
    const updateResult = await pool.query(
      `UPDATE collector_issues 
       SET status = 'approved', approved_at = NOW(), approved_by = $1, resolution_notes = $2
       WHERE issue_id = $3 AND status = 'pending'
       RETURNING *`,
      [approvedBy, resolution_notes || null, parseInt(issue_id, 10)]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Issue not found or already processed' 
      });
    }

    const issue = updateResult.rows[0];

    // Notify collector of approval
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at, notification_type)
       VALUES (
         (SELECT user_id FROM collectors WHERE collector_id = $1), 
         $2, $3, false, NOW(), 'issue_approved'
       )`,
      [
        issue.collector_id,
        'Route Issue Approved',
        `Your ${issue.issue_type.replace('_', ' ')} request has been approved. ${resolution_notes || 'You may proceed with the requested action.'}`
      ]
    );

    // If approved action requires rescheduling, create reschedule tasks
    if (['reschedule_tomorrow', 'cancel_route'].includes(issue.requested_action) && issue.affected_schedule_ids) {
      await handleApprovedRescheduling(issue);
    }

    return res.json({ success: true, message: 'Issue approved successfully' });

  } catch (error) {
    console.error('Error approving issue:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to approve issue', 
      details: error.message 
    });
  }
});

// POST /api/collector/issues/:issue_id/reject - Admin only: Reject issue request
router.post('/:issue_id/reject', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { resolution_notes } = req.body;
    const approvedBy = req.user?.userId || 'admin';

    // Update issue status
    const updateResult = await pool.query(
      `UPDATE collector_issues 
       SET status = 'rejected', approved_at = NOW(), approved_by = $1, resolution_notes = $2
       WHERE issue_id = $3 AND status = 'pending'
       RETURNING *`,
      [approvedBy, resolution_notes || null, parseInt(issue_id, 10)]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Issue not found or already processed' 
      });
    }

    const issue = updateResult.rows[0];

    // Notify collector of rejection
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at, notification_type)
       VALUES (
         (SELECT user_id FROM collectors WHERE collector_id = $1), 
         $2, $3, false, NOW(), 'issue_rejected'
       )`,
      [
        issue.collector_id,
        'Route Issue Request Rejected',
        `Your ${issue.issue_type.replace('_', ' ')} request has been rejected. ${resolution_notes || 'Please contact your supervisor for alternative solutions.'}`
      ]
    );

    return res.json({ success: true, message: 'Issue rejected successfully' });

  } catch (error) {
    console.error('Error rejecting issue:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to reject issue', 
      details: error.message 
    });
  }
});

// Helper function to handle approved rescheduling
async function handleApprovedRescheduling(issue) {
  try {
    const scheduleIds = JSON.parse(issue.affected_schedule_ids || '[]');
    
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

      // Calculate reschedule date
      let rescheduleDate;
      if (issue.requested_action === 'reschedule_tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        rescheduleDate = tomorrow.toISOString().split('T')[0];
      } else if (issue.requested_action === 'cancel_route') {
        // Find next regular schedule for this route
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        rescheduleDate = nextWeek.toISOString().split('T')[0];
      }

      for (const resident of residents.rows) {
        await pool.query(
          `INSERT INTO reschedule_tasks (user_id, origin_schedule_id, scheduled_date, status, source, notes)
           VALUES ($1, $2, $3::date, 'pending', 'admin_approved', $4)`,
          [
            resident.user_id,
            scheduleId,
            rescheduleDate,
            `Rescheduled due to approved issue #${issue.issue_id}. Collector #${issue.collector_id}.`
          ]
        );

        // Notify resident
        const actionText = issue.requested_action === 'cancel_route' ? 'cancelled' : 'rescheduled';
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, is_read, created_at)
           VALUES ($1, $2, $3, false, NOW())`,
          [
            resident.user_id,
            `Collection ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
            `Your collection has been ${actionText} due to operational requirements. New pickup date: ${rescheduleDate}. We apologize for any inconvenience.`
          ]
        );
      }
    }
  } catch (e) {
    console.warn('Failed to handle approved rescheduling:', e.message);
  }
}

module.exports = router;
