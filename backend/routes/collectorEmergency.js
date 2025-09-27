const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');
const {
  notifyTruckBreakdown,
  notifyRouteReassignment,
  broadcastEmergencyAlert,
  notifyMaintenanceReminder,
  sendCollectorMessage
} = require('../services/collectorNotificationService');

// Report truck breakdown
router.post('/breakdown', authenticateJWT, async (req, res) => {
  try {
    const { collector_id, truck_id, location, issue, severity, description } = req.body;
    
    if (!collector_id || !truck_id || !location || !issue) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: collector_id, truck_id, location, issue' 
      });
    }
    
    // Log the breakdown in database
    const breakdownQuery = `
      INSERT INTO collector_issues (collector_id, issue_type, description, location, status, severity, created_at)
      VALUES ($1, $2, $3, $4, 'reported', $5, NOW())
      RETURNING issue_id
    `;
    
    const breakdownResult = await query(breakdownQuery, [
      collector_id,
      'truck_breakdown',
      `${issue}: ${description || 'No additional details'}`,
      location,
      severity || 'medium'
    ]);
    
    // Send notifications
    const notificationResult = await notifyTruckBreakdown(collector_id, truck_id, {
      location,
      issue,
      severity,
      description
    });
    
    res.json({
      success: true,
      message: 'Breakdown reported successfully',
      issue_id: breakdownResult.rows[0].issue_id,
      notifications_sent: notificationResult.notified_collectors
    });
    
  } catch (error) {
    console.error('Error reporting breakdown:', error);
    res.status(500).json({ success: false, error: 'Failed to report breakdown' });
  }
});

// Request backup assistance
router.post('/request-backup', authenticateJWT, async (req, res) => {
  try {
    const { collector_id, location, reason, urgency } = req.body;
    
    if (!collector_id || !location || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: collector_id, location, reason' 
      });
    }
    
    // Get collector info
    const collectorQuery = `
      SELECT c.user_id, u.username, un.first_name, un.last_name, t.truck_number
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN trucks t ON c.truck_id = t.truck_id
      WHERE c.collector_id = $1
    `;
    const collectorResult = await query(collectorQuery, [collector_id]);
    
    if (collectorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Collector not found' });
    }
    
    const collector = collectorResult.rows[0];
    const collectorName = `${collector.first_name || ''} ${collector.last_name || ''}`.trim() || collector.username;
    
    // Find nearby collectors
    const nearbyCollectorsQuery = `
      SELECT DISTINCT c.collector_id, c.user_id, u.username, un.first_name, un.last_name, t.truck_number
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN trucks t ON c.truck_id = t.truck_id
      WHERE c.collector_id != $1 
        AND c.status = 'active'
        AND t.status = 'active'
      LIMIT 5
    `;
    const nearbyResult = await query(nearbyCollectorsQuery, [collector_id]);
    
    // Send backup requests
    for (const nearbyCollector of nearbyResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          nearbyCollector.user_id,
          '🆘 Backup Request',
          `${collectorName} (Truck ${collector.truck_number}) needs backup at ${location}. Reason: ${reason}. Urgency: ${urgency || 'Normal'}`,
          'backup_request'
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'Backup request sent successfully',
      notified_collectors: nearbyResult.rows.length
    });
    
  } catch (error) {
    console.error('Error requesting backup:', error);
    res.status(500).json({ success: false, error: 'Failed to request backup' });
  }
});

// Send message to another collector
router.post('/send-message', authenticateJWT, async (req, res) => {
  try {
    const { from_collector_id, to_collector_id, subject, message, priority } = req.body;
    
    if (!from_collector_id || !to_collector_id || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: from_collector_id, to_collector_id, subject, message' 
      });
    }
    
    await sendCollectorMessage(from_collector_id, to_collector_id, {
      subject,
      message,
      priority
    });
    
    res.json({
      success: true,
      message: 'Message sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Get emergency contacts
router.get('/contacts', authenticateJWT, async (req, res) => {
  try {
    const { collector_id } = req.query;
    
    // Get all active collectors except the requesting one
    const contactsQuery = `
      SELECT 
        c.collector_id,
        u.username,
        un.first_name,
        un.last_name,
        u.contact_number,
        t.truck_number,
        t.plate_number,
        'collector' as contact_type
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN trucks t ON c.truck_id = t.truck_id
      WHERE c.collector_id != $1 AND c.status = 'active'
      
      UNION ALL
      
      SELECT 
        NULL as collector_id,
        u.username,
        un.first_name,
        un.last_name,
        u.contact_number,
        'N/A' as truck_number,
        'N/A' as plate_number,
        'admin' as contact_type
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN user_roles ur ON u.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.role_id
      WHERE r.role_name = 'admin'
      
      ORDER BY contact_type, first_name, last_name
    `;
    
    const contactsResult = await query(contactsQuery, [collector_id || 0]);
    
    const formattedContacts = contactsResult.rows.map(contact => ({
      id: contact.collector_id || `admin_${contact.username}`,
      name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.username,
      phone: contact.contact_number,
      truck: contact.truck_number !== 'N/A' ? contact.truck_number : null,
      plate: contact.plate_number !== 'N/A' ? contact.plate_number : null,
      type: contact.contact_type
    }));
    
    res.json({
      success: true,
      contacts: formattedContacts
    });
    
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// Emergency broadcast (admin only)
router.post('/broadcast', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin
    const userRoleQuery = `
      SELECT r.role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.role_id 
      WHERE ur.user_id = $1
    `;
    const roleResult = await query(userRoleQuery, [req.user.userId]);
    
    const isAdmin = roleResult.rows.some(role => role.role_name === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { title, message, severity, affected_areas } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, message' 
      });
    }
    
    const result = await broadcastEmergencyAlert({
      title,
      message,
      severity,
      affected_areas
    });
    
    res.json({
      success: true,
      message: 'Emergency alert broadcast successfully',
      notified_count: result.notified_count
    });
    
  } catch (error) {
    console.error('Error broadcasting alert:', error);
    res.status(500).json({ success: false, error: 'Failed to broadcast alert' });
  }
});

module.exports = router;
