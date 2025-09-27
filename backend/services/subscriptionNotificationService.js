const { pool } = require('../config/db');

/**
 * Subscription & Payment Notification Service
 * Handles all subscription-related notifications that were missing from the system
 */

// Helper function to create notification for a user
const createUserNotification = async (userId, title, message, notificationType = null) => {
  try {
    const query = `
      INSERT INTO notifications (user_id, title, message, is_read, created_at, notification_type)
      VALUES ($1, $2, $3, false, NOW(), $4)
      RETURNING notification_id
    `;
    const result = await pool.query(query, [userId, title, message, notificationType]);
    console.log(`✅ Notification created for user ${userId}: ${title}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Failed to create user notification:', error);
    throw error;
  }
};

// Helper function to create admin notifications
const createAdminNotification = async (title, message, notificationType = null) => {
  try {
    // Get all admin users
    const adminQuery = `
      SELECT u.user_id 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE r.role_name = 'admin'
    `;
    const adminResult = await pool.query(adminQuery);
    
    // Create notification for each admin
    for (const admin of adminResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, is_read, created_at, notification_type) 
         VALUES ($1, $2, $3, false, NOW(), $4)`,
        [admin.user_id, title, message, notificationType]
      );
    }
    console.log(`✅ Admin notification created: ${title}`);
  } catch (error) {
    console.error('❌ Failed to create admin notification:', error);
    throw error;
  }
};

// 1. SUBSCRIPTION ACTIVATION NOTIFICATION
const notifySubscriptionActivated = async (userId, subscriptionData) => {
  try {
    const title = '🎉 Subscription Activated!';
    const message = `Your ${subscriptionData.plan_name} subscription has been successfully activated. You can now enjoy our waste collection services. Next collection: ${subscriptionData.next_collection_date || 'TBD'}`;
    
    await createUserNotification(userId, title, message, 'subscription_activated');
    
    // Also notify admins
    await createAdminNotification(
      '📋 New Subscription Activated',
      `User subscription activated: ${subscriptionData.plan_name} - ₱${subscriptionData.price}`,
      'subscription_activated'
    );
  } catch (error) {
    console.error('❌ Failed to send subscription activation notification:', error);
    throw error;
  }
};

// 2. PAYMENT CONFIRMATION NOTIFICATION
const notifyPaymentConfirmed = async (userId, paymentData) => {
  try {
    const title = '💰 Payment Confirmed';
    const message = `Your payment of ₱${paymentData.amount} via ${paymentData.method} has been confirmed. Reference: ${paymentData.reference_number}. Thank you for your payment!`;
    
    await createUserNotification(userId, title, message, 'payment_confirmed');
    
    // Notify admins
    await createAdminNotification(
      '💳 Payment Received',
      `Payment confirmed: ₱${paymentData.amount} via ${paymentData.method} - Ref: ${paymentData.reference_number}`,
      'payment_received'
    );
  } catch (error) {
    console.error('❌ Failed to send payment confirmation notification:', error);
    throw error;
  }
};

// 3. INVOICE GENERATION NOTIFICATION
const notifyInvoiceGenerated = async (userId, invoiceData) => {
  try {
    const title = '📄 New Invoice Generated';
    const message = `A new invoice (${invoiceData.invoice_number}) for ₱${invoiceData.amount} has been generated. Due date: ${invoiceData.due_date}. Please pay on time to avoid late fees.`;
    
    await createUserNotification(userId, title, message, 'invoice_generated');
  } catch (error) {
    console.error('❌ Failed to send invoice generation notification:', error);
    throw error;
  }
};

// 4. PAYMENT OVERDUE WARNING
const notifyPaymentOverdue = async (userId, invoiceData) => {
  try {
    const title = '⚠️ Payment Overdue';
    const message = `Your payment for invoice ${invoiceData.invoice_number} (₱${invoiceData.amount}) is overdue. Please pay immediately to avoid service interruption and additional late fees.`;
    
    await createUserNotification(userId, title, message, 'payment_overdue');
    
    // Notify admins about overdue payment
    await createAdminNotification(
      '🚨 Overdue Payment Alert',
      `Invoice ${invoiceData.invoice_number} is overdue - ₱${invoiceData.amount}`,
      'payment_overdue'
    );
  } catch (error) {
    console.error('❌ Failed to send payment overdue notification:', error);
    throw error;
  }
};

// 5. SUBSCRIPTION EXPIRATION WARNING
const notifySubscriptionExpiring = async (userId, subscriptionData) => {
  try {
    const title = '⏰ Subscription Expiring Soon';
    const message = `Your ${subscriptionData.plan_name} subscription will expire on ${subscriptionData.expiry_date}. Please renew to continue enjoying our services.`;
    
    await createUserNotification(userId, title, message, 'subscription_expiring');
  } catch (error) {
    console.error('❌ Failed to send subscription expiration notification:', error);
    throw error;
  }
};

// 6. SUBSCRIPTION REACTIVATION NOTIFICATION
const notifySubscriptionReactivated = async (userId, subscriptionData) => {
  try {
    const title = '🔄 Subscription Reactivated';
    const message = `Welcome back! Your ${subscriptionData.plan_name} subscription has been reactivated. Your waste collection services will resume shortly.`;
    
    await createUserNotification(userId, title, message, 'subscription_reactivated');
    
    // Notify admins
    await createAdminNotification(
      '🔄 Subscription Reactivated',
      `User reactivated subscription: ${subscriptionData.plan_name}`,
      'subscription_reactivated'
    );
  } catch (error) {
    console.error('❌ Failed to send subscription reactivation notification:', error);
    throw error;
  }
};

// 7. LATE FEE ADDED NOTIFICATION
const notifyLateFeeAdded = async (userId, invoiceData) => {
  try {
    const title = '💸 Late Fee Added';
    const message = `A late fee of ₱${invoiceData.late_fee} has been added to your invoice ${invoiceData.invoice_number}. New total: ₱${invoiceData.new_total}. Please pay to avoid further penalties.`;
    
    await createUserNotification(userId, title, message, 'late_fee_added');
  } catch (error) {
    console.error('❌ Failed to send late fee notification:', error);
    throw error;
  }
};

// 8. UPCOMING COLLECTION REMINDER
const notifyUpcomingCollection = async (userId, collectionData) => {
  try {
    const title = '🗑️ Collection Reminder';
    const message = `Your waste collection is scheduled for ${collectionData.collection_date} at approximately ${collectionData.estimated_time}. Please have your waste ready for pickup.`;
    
    await createUserNotification(userId, title, message, 'collection_reminder');
  } catch (error) {
    console.error('❌ Failed to send collection reminder notification:', error);
    throw error;
  }
};

// 9. COLLECTION COMPLETED NOTIFICATION
const notifyCollectionCompleted = async (userId, collectionData) => {
  try {
    const title = '✅ Collection Completed';
    const message = `Your waste has been successfully collected on ${collectionData.collection_date}. Thank you for using our service! Next collection: ${collectionData.next_collection_date}`;
    
    await createUserNotification(userId, title, message, 'collection_completed');
  } catch (error) {
    console.error('❌ Failed to send collection completion notification:', error);
    throw error;
  }
};

// 10. MONTHLY INVOICE GENERATION NOTIFICATION (for admins)
const notifyMonthlyInvoicesGenerated = async (invoiceCount, totalAmount) => {
  try {
    const title = '📊 Monthly Invoices Generated';
    const message = `${invoiceCount} monthly invoices have been generated with a total value of ₱${totalAmount}. Please review the billing dashboard for details.`;
    
    await createAdminNotification(title, message, 'monthly_invoices_generated');
  } catch (error) {
    console.error('❌ Failed to send monthly invoice generation notification:', error);
    throw error;
  }
};

module.exports = {
  notifySubscriptionActivated,
  notifyPaymentConfirmed,
  notifyInvoiceGenerated,
  notifyPaymentOverdue,
  notifySubscriptionExpiring,
  notifySubscriptionReactivated,
  notifyLateFeeAdded,
  notifyUpcomingCollection,
  notifyCollectionCompleted,
  notifyMonthlyInvoicesGenerated,
  createUserNotification,
  createAdminNotification
};
