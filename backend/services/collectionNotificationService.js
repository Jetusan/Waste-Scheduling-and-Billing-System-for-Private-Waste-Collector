const { pool } = require('../config/db');
const {
  createUserNotification,
  createAdminNotification
} = require('./subscriptionNotificationService');

/**
 * Collection-related notification service
 * Handles notifications for collection schedules, reminders, and completions
 */

// 1. UPCOMING COLLECTION REMINDER (24 hours before)
const sendCollectionReminders = async () => {
  try {
    console.log('🔔 Sending collection reminders...');
    
    // Get all active subscriptions with upcoming collections (next 24 hours)
    const query = `
      SELECT DISTINCT
        cs.user_id,
        cs.subscription_id,
        sp.plan_name,
        u.username,
        u.email,
        ca.address_line_1,
        ca.barangay,
        ca.city
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN customer_addresses ca ON u.user_id = ca.user_id
      WHERE cs.status = 'active' 
        AND cs.payment_status = 'paid'
        AND DATE(NOW() + INTERVAL '1 day') = DATE(NOW() + INTERVAL '1 day')
    `;
    
    const result = await pool.query(query);
    
    for (const subscriber of result.rows) {
      const collectionDate = new Date();
      collectionDate.setDate(collectionDate.getDate() + 1);
      
      await createUserNotification(
        subscriber.user_id,
        '🗑️ Collection Reminder',
        `Your waste collection is scheduled for tomorrow (${collectionDate.toLocaleDateString()}). Please have your waste ready for pickup by 8:00 AM.`,
        'collection_reminder'
      );
    }
    
    console.log(`✅ Sent ${result.rows.length} collection reminders`);
    return result.rows.length;
  } catch (error) {
    console.error('❌ Failed to send collection reminders:', error);
    throw error;
  }
};

// 2. COLLECTION COMPLETION NOTIFICATION
const notifyCollectionCompleted = async (userId, collectionData) => {
  try {
    const nextCollectionDate = new Date(collectionData.collection_date);
    nextCollectionDate.setDate(nextCollectionDate.getDate() + 7); // Weekly collection
    
    await createUserNotification(
      userId,
      '✅ Collection Completed',
      `Your waste has been successfully collected on ${new Date(collectionData.collection_date).toLocaleDateString()}. Thank you for using our service! Next collection: ${nextCollectionDate.toLocaleDateString()}`,
      'collection_completed'
    );
  } catch (error) {
    console.error('❌ Failed to send collection completion notification:', error);
    throw error;
  }
};

// 3. COLLECTION SCHEDULE CHANGE NOTIFICATION
const notifyScheduleChange = async (userId, scheduleData) => {
  try {
    await createUserNotification(
      userId,
      '📅 Collection Schedule Changed',
      `Your collection schedule has been updated. New date: ${scheduleData.new_date}, Time: ${scheduleData.new_time}. Reason: ${scheduleData.reason || 'Schedule optimization'}`,
      'schedule_change'
    );
  } catch (error) {
    console.error('❌ Failed to send schedule change notification:', error);
    throw error;
  }
};

// 4. COLLECTOR ASSIGNMENT NOTIFICATION
const notifyCollectorAssigned = async (userId, collectorData) => {
  try {
    await createUserNotification(
      userId,
      '👷 Collector Assigned',
      `${collectorData.collector_name} has been assigned to your area for waste collection. Contact: ${collectorData.phone || 'N/A'}`,
      'collector_assigned'
    );
  } catch (error) {
    console.error('❌ Failed to send collector assignment notification:', error);
    throw error;
  }
};

// 5. PAYMENT OVERDUE - COLLECTION SUSPENSION WARNING
const notifyCollectionSuspensionWarning = async (userId, invoiceData) => {
  try {
    await createUserNotification(
      userId,
      '⚠️ Collection Suspension Warning',
      `Your payment for invoice ${invoiceData.invoice_number} is overdue. Collection services will be suspended in 3 days if payment is not received. Amount due: ₱${invoiceData.amount}`,
      'suspension_warning'
    );
  } catch (error) {
    console.error('❌ Failed to send suspension warning notification:', error);
    throw error;
  }
};

// 6. COLLECTION SERVICE SUSPENDED
const notifyCollectionSuspended = async (userId, suspensionData) => {
  try {
    await createUserNotification(
      userId,
      '🚫 Collection Service Suspended',
      `Your waste collection service has been suspended due to overdue payment. Please pay your outstanding balance of ₱${suspensionData.amount} to reactivate service.`,
      'service_suspended'
    );
  } catch (error) {
    console.error('❌ Failed to send suspension notification:', error);
    throw error;
  }
};

// 7. BULK NOTIFICATION FOR WEATHER/EMERGENCY DELAYS
const notifyCollectionDelay = async (affectedUserIds, delayData) => {
  try {
    const title = '🌧️ Collection Delayed';
    const message = `Due to ${delayData.reason}, waste collection scheduled for ${delayData.original_date} has been rescheduled to ${delayData.new_date}. We apologize for the inconvenience.`;
    
    for (const userId of affectedUserIds) {
      await createUserNotification(userId, title, message, 'collection_delayed');
    }
    
    // Notify admins
    await createAdminNotification(
      '📊 Bulk Collection Delay Notification Sent',
      `Notified ${affectedUserIds.length} users about collection delay due to ${delayData.reason}`,
      'bulk_notification_sent'
    );
    
    console.log(`✅ Sent delay notifications to ${affectedUserIds.length} users`);
  } catch (error) {
    console.error('❌ Failed to send delay notifications:', error);
    throw error;
  }
};

module.exports = {
  sendCollectionReminders,
  notifyCollectionCompleted,
  notifyScheduleChange,
  notifyCollectorAssigned,
  notifyCollectionSuspensionWarning,
  notifyCollectionSuspended,
  notifyCollectionDelay
};
