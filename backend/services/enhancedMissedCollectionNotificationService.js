const { pool } = require('../config/db');
const { 
  createUserNotification,
  createAdminNotification 
} = require('./subscriptionNotificationService');

/**
 * Enhanced Missed Collection Notification Service
 * Handles notifications for the new enhanced missed collection system
 */

// 1. MISSED COLLECTION REPORTED - Notify Resident
const notifyResidentMissedCollection = async (userId, missedCollectionData) => {
  try {
    const { fault_type, issue_description, severity, estimated_delay_days, catchup_date } = missedCollectionData;
    
    let title, message;
    
    if (fault_type === 'collector_fault') {
      title = '⚠️ Collection Issue Reported';
      message = `We apologize - your collection was missed due to: ${issue_description}. `;
      
      if (catchup_date) {
        message += `A catch-up collection has been scheduled for ${new Date(catchup_date).toLocaleDateString()}. `;
      }
      
      if (severity === 'high') {
        message += 'This is a high priority issue and will be resolved quickly.';
      } else {
        message += `Estimated resolution: ${estimated_delay_days} day(s).`;
      }
    } else {
      title = '📋 Collection Status Update';
      message = `Your collection was missed because you were not available. Don't worry - it will be included in your next regular collection schedule.`;
    }
    
    await createUserNotification(userId, title, message, 'missed_collection_reported');
    console.log(`✅ Resident notification sent for missed collection: User ${userId}`);
  } catch (error) {
    console.error('❌ Failed to notify resident of missed collection:', error);
    throw error;
  }
};

// 2. CATCHUP TASK SCHEDULED - Notify Collector
const notifyCollectorCatchupScheduled = async (collectorId, catchupData) => {
  try {
    const { resident_name, address, issue_description, scheduled_date, priority } = catchupData;
    
    // Get collector's user_id
    const collectorQuery = `SELECT user_id FROM collectors WHERE collector_id = $1`;
    const collectorResult = await pool.query(collectorQuery, [collectorId]);
    
    if (collectorResult.rows.length === 0) {
      console.warn(`⚠️ Collector ${collectorId} not found for catchup notification`);
      return;
    }
    
    const collectorUserId = collectorResult.rows[0].user_id;
    const priorityText = priority === 3 ? 'HIGH' : priority === 2 ? 'MEDIUM' : 'LOW';
    
    const title = '📋 New Catch-up Task Assigned';
    const message = `Catch-up collection scheduled for ${new Date(scheduled_date).toLocaleDateString()}\n` +
                   `Resident: ${resident_name}\n` +
                   `Address: ${address}\n` +
                   `Issue: ${issue_description}\n` +
                   `Priority: ${priorityText}`;
    
    await createUserNotification(collectorUserId, title, message, 'catchup_scheduled');
    console.log(`✅ Collector notification sent for catchup task: Collector ${collectorId}`);
  } catch (error) {
    console.error('❌ Failed to notify collector of catchup task:', error);
    throw error;
  }
};

// 3. CATCHUP TASK COMPLETED - Notify Resident
const notifyResidentCatchupCompleted = async (userId, completionData) => {
  try {
    const { completion_date, collector_name, status, completion_notes } = completionData;
    
    let title, message;
    
    if (status === 'completed') {
      title = '✅ Catch-up Collection Completed';
      message = `Great news! Your catch-up collection was successfully completed on ${new Date(completion_date).toLocaleDateString()}`;
      
      if (collector_name) {
        message += ` by ${collector_name}`;
      }
      
      message += '. Thank you for your patience!';
      
      if (completion_notes) {
        message += `\n\nNotes: ${completion_notes}`;
      }
    } else {
      title = '📋 Catch-up Collection Update';
      message = `Your catch-up collection scheduled for ${new Date(completion_date).toLocaleDateString()} has been updated with status: ${status}`;
      
      if (completion_notes) {
        message += `\n\nNotes: ${completion_notes}`;
      }
    }
    
    await createUserNotification(userId, title, message, 'catchup_completed');
    console.log(`✅ Resident notification sent for catchup completion: User ${userId}`);
  } catch (error) {
    console.error('❌ Failed to notify resident of catchup completion:', error);
    throw error;
  }
};

// 4. ADMIN NOTIFICATION - Missed Collection Analytics
const notifyAdminMissedCollectionTrends = async (analyticsData) => {
  try {
    const { 
      total_missed_today, 
      collector_faults, 
      resident_faults, 
      high_severity_count,
      pending_catchups 
    } = analyticsData;
    
    const title = '📊 Daily Missed Collection Report';
    const message = `Missed Collections Summary for ${new Date().toLocaleDateString()}:\n\n` +
                   `• Total Missed: ${total_missed_today}\n` +
                   `• Collector Issues: ${collector_faults}\n` +
                   `• Resident Issues: ${resident_faults}\n` +
                   `• High Severity: ${high_severity_count}\n` +
                   `• Pending Catch-ups: ${pending_catchups}\n\n` +
                   `${high_severity_count > 0 ? '⚠️ High severity issues require immediate attention!' : '✅ All issues are manageable.'}`;
    
    await createAdminNotification(title, message, 'missed_collection_analytics');
    console.log('✅ Admin notification sent for missed collection trends');
  } catch (error) {
    console.error('❌ Failed to send admin missed collection analytics:', error);
    throw error;
  }
};

// 5. OVERDUE CATCHUP REMINDER - Notify Collector
const notifyCollectorOverdueCatchup = async (collectorId, overdueData) => {
  try {
    const { overdue_tasks, oldest_task_date } = overdueData;
    
    // Get collector's user_id
    const collectorQuery = `SELECT user_id FROM collectors WHERE collector_id = $1`;
    const collectorResult = await pool.query(collectorQuery, [collectorId]);
    
    if (collectorResult.rows.length === 0) {
      console.warn(`⚠️ Collector ${collectorId} not found for overdue notification`);
      return;
    }
    
    const collectorUserId = collectorResult.rows[0].user_id;
    
    const title = '⏰ Overdue Catch-up Tasks';
    const message = `You have ${overdue_tasks} overdue catch-up task(s). ` +
                   `The oldest task was scheduled for ${new Date(oldest_task_date).toLocaleDateString()}. ` +
                   `Please complete these tasks as soon as possible to maintain service quality.`;
    
    await createUserNotification(collectorUserId, title, message, 'overdue_catchup');
    console.log(`✅ Overdue catchup notification sent to collector: ${collectorId}`);
  } catch (error) {
    console.error('❌ Failed to notify collector of overdue catchups:', error);
    throw error;
  }
};

// 6. BULK NOTIFICATION - System-wide Collection Issues
const notifySystemWideCollectionIssue = async (issueData) => {
  try {
    const { issue_type, affected_areas, estimated_resolution, message_override } = issueData;
    
    let title, message;
    
    if (message_override) {
      title = '🚨 Collection Service Alert';
      message = message_override;
    } else {
      title = '🚨 Collection Service Disruption';
      message = `We are experiencing ${issue_type} affecting collection services in: ${affected_areas.join(', ')}. `;
      
      if (estimated_resolution) {
        message += `Estimated resolution: ${estimated_resolution}. `;
      }
      
      message += 'We apologize for the inconvenience and are working to resolve this quickly.';
    }
    
    // Get all active subscribers in affected areas
    const affectedUsersQuery = `
      SELECT DISTINCT u.user_id
      FROM users u
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE b.barangay_name = ANY($1)
        AND EXISTS (
          SELECT 1 FROM customer_subscriptions cs 
          WHERE cs.user_id = u.user_id AND cs.status = 'active'
        )
    `;
    
    const affectedUsers = await pool.query(affectedUsersQuery, [affected_areas]);
    
    // Send notification to all affected users
    for (const user of affectedUsers.rows) {
      await createUserNotification(user.user_id, title, message, 'system_wide_issue');
    }
    
    // Notify admins
    await createAdminNotification(
      '📢 System-wide Notification Sent',
      `Sent collection disruption notification to ${affectedUsers.rowCount} users in areas: ${affected_areas.join(', ')}`,
      'bulk_notification_sent'
    );
    
    console.log(`✅ System-wide notification sent to ${affectedUsers.rowCount} users`);
  } catch (error) {
    console.error('❌ Failed to send system-wide collection notification:', error);
    throw error;
  }
};

module.exports = {
  notifyResidentMissedCollection,
  notifyCollectorCatchupScheduled,
  notifyResidentCatchupCompleted,
  notifyAdminMissedCollectionTrends,
  notifyCollectorOverdueCatchup,
  notifySystemWideCollectionIssue
};
