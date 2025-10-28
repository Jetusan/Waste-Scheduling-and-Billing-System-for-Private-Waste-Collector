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
  } catch (error) {
    console.error('❌ Error sending collection reminders:', error);
  }
};

// 2. COLLECTION COMPLETION NOTIFICATION
const notifyCollectionCompleted = async (userId, collectorName = 'Collector', paymentAmount = null) => {
  try {
    const completionTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      hour12: true,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    let message = `Your waste has been successfully collected by ${collectorName} at ${completionTime}.`;
    
    if (paymentAmount) {
      message += ` Payment of ₱${paymentAmount} was also collected.`;
    }
    
    message += ' Thank you for your cooperation!';
    
    await createUserNotification(
      userId,
      '✅ Waste Collected',
      message,
      'collection_completed'
    );
    
    console.log(`✅ Collection completion notification sent to user ${userId}`);
  } catch (error) {
    console.error('❌ Error sending collection completion notification:', error);
  }
};

// 3. MISSED COLLECTION NOTIFICATION
const notifyMissedCollection = async (userId, reason = 'Not available') => {
  try {
    const missedTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      hour12: true,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    await createUserNotification(
      userId,
      '⚠️ Missed Collection',
      `We were unable to collect your waste at ${missedTime}. Reason: ${reason}. We'll try again on the next scheduled collection day.`,
      'collection_missed'
    );
    
    console.log(`⚠️ Missed collection notification sent to user ${userId}`);
  } catch (error) {
    console.error('❌ Error sending missed collection notification:', error);
  }
};

// 4. CASH PAYMENT CONFIRMATION NOTIFICATION
const notifyPaymentCollected = async (userId, amount, collectorName = 'Collector') => {
  try {
    const paymentTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      hour12: true,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    await createUserNotification(
      userId,
      '💰 Payment Collected',
      `Your cash payment of ₱${amount} has been successfully collected by ${collectorName} at ${paymentTime}. Your subscription is now active!`,
      'payment_collected'
    );
    
    console.log(`💰 Payment collection notification sent to user ${userId}`);
  } catch (error) {
    console.error('❌ Error sending payment collection notification:', error);
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
  notifyMissedCollection,
  notifyPaymentCollected,
  notifyCollectionSuspensionWarning,
  notifyCollectionSuspended,
  notifyCollectionDelay
};
