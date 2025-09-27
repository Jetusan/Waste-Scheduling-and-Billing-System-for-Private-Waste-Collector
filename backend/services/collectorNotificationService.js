const { query } = require('../config/db');

/**
 * Collector Communication & Emergency Notification Service
 * Handles truck breakdowns, emergency alerts, and inter-collector communication
 */

// 1. TRUCK BREAKDOWN NOTIFICATION SYSTEM
const notifyTruckBreakdown = async (collectorId, truckId, breakdownDetails) => {
  try {
    const { location, issue, severity = 'medium' } = breakdownDetails;
    
    // Get collector info
    const collectorQuery = `
      SELECT c.user_id, u.username, un.first_name, un.last_name, t.truck_number, t.plate_number
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN trucks t ON c.truck_id = t.truck_id
      WHERE c.collector_id = $1
    `;
    const collectorResult = await query(collectorQuery, [collectorId]);
    
    if (collectorResult.rows.length === 0) {
      throw new Error('Collector not found');
    }
    
    const collector = collectorResult.rows[0];
    const collectorName = `${collector.first_name || ''} ${collector.last_name || ''}`.trim() || collector.username;
    
    // 1. Notify the collector who reported the breakdown
    await query(
      `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        collector.user_id,
        'Breakdown Report Submitted',
        `Your breakdown report for truck ${collector.truck_number} has been submitted. Emergency response team has been notified.`,
        'truck_breakdown'
      ]
    );
    
    // 2. Find nearby collectors for backup assistance
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
    const nearbyResult = await query(nearbyCollectorsQuery, [collectorId]);
    
    // 3. Notify nearby collectors about backup request
    for (const nearbyCollector of nearbyResult.rows) {
      const nearbyName = `${nearbyCollector.first_name || ''} ${nearbyCollector.last_name || ''}`.trim() || nearbyCollector.username;
      
      await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          nearbyCollector.user_id,
          '🚨 Backup Assistance Needed',
          `Collector ${collectorName} (Truck ${collector.truck_number}) needs backup assistance at ${location}. Issue: ${issue}. Contact them if available to help.`,
          'backup_request'
        ]
      );
    }
    
    // 4. Notify admin/dispatch about the breakdown
    const adminQuery = `
      SELECT u.user_id FROM users u 
      JOIN user_roles ur ON u.user_id = ur.user_id 
      JOIN roles r ON ur.role_id = r.role_id 
      WHERE r.role_name = 'admin'
    `;
    const adminResult = await query(adminQuery);
    
    for (const admin of adminResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          admin.user_id,
          '🚛 Truck Breakdown Alert',
          `Truck ${collector.truck_number} (${collector.plate_number}) breakdown reported by ${collectorName} at ${location}. Issue: ${issue}. Severity: ${severity.toUpperCase()}`,
          'emergency_alert'
        ]
      );
    }
    
    console.log(`✅ Truck breakdown notifications sent for truck ${collector.truck_number}`);
    return { success: true, notified_collectors: nearbyResult.rows.length };
    
  } catch (error) {
    console.error('❌ Failed to send truck breakdown notifications:', error);
    throw error;
  }
};

// 2. ROUTE REASSIGNMENT NOTIFICATION
const notifyRouteReassignment = async (originalCollectorId, newCollectorId, routeDetails) => {
  try {
    const { route_name, collection_date, reason } = routeDetails;
    
    // Get both collectors' info
    const collectorsQuery = `
      SELECT c.collector_id, c.user_id, u.username, un.first_name, un.last_name
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE c.collector_id IN ($1, $2)
    `;
    const collectorsResult = await query(collectorsQuery, [originalCollectorId, newCollectorId]);
    
    const originalCollector = collectorsResult.rows.find(c => c.collector_id == originalCollectorId);
    const newCollector = collectorsResult.rows.find(c => c.collector_id == newCollectorId);
    
    if (!originalCollector || !newCollector) {
      throw new Error('One or both collectors not found');
    }
    
    const originalName = `${originalCollector.first_name || ''} ${originalCollector.last_name || ''}`.trim() || originalCollector.username;
    const newName = `${newCollector.first_name || ''} ${newCollector.last_name || ''}`.trim() || newCollector.username;
    
    // Notify original collector
    await query(
      `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        originalCollector.user_id,
        'Route Reassigned',
        `Your ${route_name} route for ${collection_date} has been reassigned to ${newName}. Reason: ${reason}`,
        'schedule_change'
      ]
    );
    
    // Notify new collector
    await query(
      `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        newCollector.user_id,
        'New Route Assignment',
        `You have been assigned ${route_name} route for ${collection_date} (previously assigned to ${originalName}). Reason: ${reason}`,
        'route_assignment'
      ]
    );
    
    console.log(`✅ Route reassignment notifications sent for ${route_name}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Failed to send route reassignment notifications:', error);
    throw error;
  }
};

// 3. EMERGENCY BROADCAST TO ALL COLLECTORS
const broadcastEmergencyAlert = async (alertDetails) => {
  try {
    const { title, message, severity = 'high', affected_areas = [] } = alertDetails;
    
    // Get all active collectors
    const collectorsQuery = `
      SELECT c.user_id, u.username, un.first_name, un.last_name
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE c.status = 'active'
    `;
    const collectorsResult = await query(collectorsQuery);
    
    // Send emergency alert to all collectors
    for (const collector of collectorsResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          collector.user_id,
          `🚨 ${title}`,
          `${message}${affected_areas.length > 0 ? ` Affected areas: ${affected_areas.join(', ')}` : ''}`,
          'emergency_alert'
        ]
      );
    }
    
    console.log(`✅ Emergency alert broadcast to ${collectorsResult.rows.length} collectors`);
    return { success: true, notified_count: collectorsResult.rows.length };
    
  } catch (error) {
    console.error('❌ Failed to broadcast emergency alert:', error);
    throw error;
  }
};

// 4. MAINTENANCE REMINDER NOTIFICATIONS
const notifyMaintenanceReminder = async (truckId, maintenanceDetails) => {
  try {
    const { maintenance_type, due_date, priority = 'medium' } = maintenanceDetails;
    
    // Get collectors assigned to this truck
    const collectorsQuery = `
      SELECT c.user_id, u.username, un.first_name, un.last_name, t.truck_number, t.plate_number
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN trucks t ON c.truck_id = t.truck_id
      WHERE t.truck_id = $1 AND c.status = 'active'
    `;
    const collectorsResult = await query(collectorsQuery, [truckId]);
    
    for (const collector of collectorsResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          collector.user_id,
          '🔧 Maintenance Reminder',
          `Truck ${collector.truck_number} (${collector.plate_number}) has ${maintenance_type} scheduled for ${due_date}. Priority: ${priority.toUpperCase()}`,
          'maintenance_alert'
        ]
      );
    }
    
    console.log(`✅ Maintenance reminders sent for truck ${collectorsResult.rows[0]?.truck_number}`);
    return { success: true, notified_count: collectorsResult.rows.length };
    
  } catch (error) {
    console.error('❌ Failed to send maintenance reminders:', error);
    throw error;
  }
};

// 5. INTER-COLLECTOR COMMUNICATION
const sendCollectorMessage = async (fromCollectorId, toCollectorId, messageDetails) => {
  try {
    const { subject, message, priority = 'normal' } = messageDetails;
    
    // Get sender info
    const senderQuery = `
      SELECT c.user_id, u.username, un.first_name, un.last_name
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE c.collector_id = $1
    `;
    const senderResult = await query(senderQuery, [fromCollectorId]);
    
    // Get receiver info
    const receiverQuery = `
      SELECT c.user_id, u.username, un.first_name, un.last_name
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE c.collector_id = $1
    `;
    const receiverResult = await query(receiverQuery, [toCollectorId]);
    
    if (senderResult.rows.length === 0 || receiverResult.rows.length === 0) {
      throw new Error('Sender or receiver not found');
    }
    
    const sender = senderResult.rows[0];
    const receiver = receiverResult.rows[0];
    const senderName = `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username;
    
    // Send message notification
    await query(
      `INSERT INTO notifications (user_id, title, message, notification_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        receiver.user_id,
        `💬 Message from ${senderName}`,
        `Subject: ${subject}\n\n${message}`,
        'communication'
      ]
    );
    
    console.log(`✅ Message sent from collector ${fromCollectorId} to ${toCollectorId}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Failed to send collector message:', error);
    throw error;
  }
};

module.exports = {
  notifyTruckBreakdown,
  notifyRouteReassignment,
  broadcastEmergencyAlert,
  notifyMaintenanceReminder,
  sendCollectorMessage
};
