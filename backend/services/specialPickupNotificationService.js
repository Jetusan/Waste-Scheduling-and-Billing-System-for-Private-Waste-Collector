const { pool } = require('../config/db');
const {
  createUserNotification,
  createAdminNotification
} = require('./subscriptionNotificationService');

/**
 * Special Pickup Notification Service
 * Handles notifications for special pickup requests and processing
 */

// 1. SPECIAL PICKUP REQUEST SUBMITTED
const notifySpecialPickupRequested = async (userId, pickupData) => {
  try {
    const title = '📋 Special Pickup Request Submitted';
    const message = `Your special pickup request for ${pickupData.waste_type} has been submitted. Request ID: ${pickupData.request_id}. We'll process your request within 24 hours.`;
    
    await createUserNotification(userId, title, message, 'special_pickup_requested');
    
    // Notify admins
    await createAdminNotification(
      '🗑️ New Special Pickup Request',
      `New special pickup request: ${pickupData.waste_type} - ${pickupData.location}`,
      'special_pickup_request'
    );
  } catch (error) {
    console.error('❌ Failed to send special pickup request notification:', error);
    throw error;
  }
};

// 2. SPECIAL PICKUP APPROVED
const notifySpecialPickupApproved = async (userId, pickupData) => {
  try {
    const title = '✅ Special Pickup Approved';
    const message = `Your special pickup request has been approved! Scheduled for ${pickupData.scheduled_date} at ${pickupData.scheduled_time}. Fee: ₱${pickupData.fee}`;
    
    await createUserNotification(userId, title, message, 'special_pickup_approved');
  } catch (error) {
    console.error('❌ Failed to send special pickup approval notification:', error);
    throw error;
  }
};

// 3. SPECIAL PICKUP REJECTED
const notifySpecialPickupRejected = async (userId, pickupData) => {
  try {
    const title = '❌ Special Pickup Request Declined';
    const message = `Your special pickup request has been declined. Reason: ${pickupData.rejection_reason}. Please contact support for more information.`;
    
    await createUserNotification(userId, title, message, 'special_pickup_rejected');
  } catch (error) {
    console.error('❌ Failed to send special pickup rejection notification:', error);
    throw error;
  }
};

// 4. SPECIAL PICKUP COMPLETED
const notifySpecialPickupCompleted = async (userId, pickupData) => {
  try {
    const title = '🎉 Special Pickup Completed';
    const message = `Your special pickup has been completed successfully on ${pickupData.completion_date}. Thank you for using our special pickup service!`;
    
    await createUserNotification(userId, title, message, 'special_pickup_completed');
  } catch (error) {
    console.error('❌ Failed to send special pickup completion notification:', error);
    throw error;
  }
};

// 5. SPECIAL PICKUP REMINDER (24 hours before)
const sendSpecialPickupReminders = async () => {
  try {
    console.log('🔔 Sending special pickup reminders...');
    
    // Get special pickups scheduled for tomorrow
    const query = `
      SELECT 
        sp.user_id,
        sp.pickup_id,
        sp.waste_type,
        sp.scheduled_date,
        sp.scheduled_time,
        sp.location,
        u.username
      FROM special_pickups sp
      JOIN users u ON sp.user_id = u.user_id
      WHERE sp.status = 'approved'
        AND DATE(sp.scheduled_date) = DATE(NOW() + INTERVAL '1 day')
    `;
    
    const result = await pool.query(query);
    
    for (const pickup of result.rows) {
      await createUserNotification(
        pickup.user_id,
        '⏰ Special Pickup Reminder',
        `Reminder: Your special pickup for ${pickup.waste_type} is scheduled for tomorrow (${new Date(pickup.scheduled_date).toLocaleDateString()}) at ${pickup.scheduled_time}. Location: ${pickup.location}`,
        'special_pickup_reminder'
      );
    }
    
    console.log(`✅ Sent ${result.rows.length} special pickup reminders`);
    return result.rows.length;
  } catch (error) {
    console.error('❌ Failed to send special pickup reminders:', error);
    throw error;
  }
};

module.exports = {
  notifySpecialPickupRequested,
  notifySpecialPickupApproved,
  notifySpecialPickupRejected,
  notifySpecialPickupCompleted,
  sendSpecialPickupReminders
};
