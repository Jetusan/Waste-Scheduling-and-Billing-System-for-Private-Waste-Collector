const cron = require('node-cron');
const { pool } = require('../config/db');
const {
  notifyPaymentOverdue,
  notifySubscriptionExpiring,
  createUserNotification
} = require('./subscriptionNotificationService');
const { sendCollectionReminders } = require('./collectionNotificationService');

/**
 * Automated Notification Scheduler
 * Handles time-based notifications that should run automatically
 */

// 1. DAILY COLLECTION REMINDERS (runs at 6 PM daily)
const scheduleCollectionReminders = () => {
  cron.schedule('0 18 * * *', async () => {
    console.log('🕕 Running daily collection reminder job...');
    try {
      await sendCollectionReminders();
    } catch (error) {
      console.error('❌ Collection reminder job failed:', error);
    }
  });
};

// 2. OVERDUE PAYMENT CHECKER (runs daily at 9 AM)
const scheduleOverduePaymentCheck = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('🕘 Running overdue payment check...');
    try {
      const overdueQuery = `
        SELECT 
          i.invoice_id,
          i.invoice_number,
          i.user_id,
          i.amount,
          i.due_date,
          u.username,
          u.email
        FROM invoices i
        JOIN users u ON i.user_id = u.user_id
        WHERE i.status = 'unpaid' 
          AND i.due_date < CURRENT_DATE
          AND i.due_date >= CURRENT_DATE - INTERVAL '30 days'
      `;
      
      const result = await pool.query(overdueQuery);
      
      for (const invoice of result.rows) {
        await notifyPaymentOverdue(invoice.user_id, {
          invoice_number: invoice.invoice_number,
          amount: invoice.amount
        });
        
        // Update invoice status to overdue
        await pool.query(
          'UPDATE invoices SET status = $1 WHERE invoice_id = $2',
          ['overdue', invoice.invoice_id]
        );
      }
      
      console.log(`✅ Processed ${result.rows.length} overdue payments`);
    } catch (error) {
      console.error('❌ Overdue payment check failed:', error);
    }
  });
};

// 3. SUBSCRIPTION EXPIRATION WARNING (runs weekly on Mondays at 10 AM)
const scheduleSubscriptionExpirationCheck = () => {
  cron.schedule('0 10 * * 1', async () => {
    console.log('🕙 Running subscription expiration check...');
    try {
      const expiringQuery = `
        SELECT 
          cs.user_id,
          cs.subscription_id,
          sp.plan_name,
          cs.billing_start_date,
          u.username
        FROM customer_subscriptions cs
        JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        JOIN users u ON cs.user_id = u.user_id
        WHERE cs.status = 'active'
          AND cs.billing_start_date + INTERVAL '25 days' <= CURRENT_DATE
          AND cs.billing_start_date + INTERVAL '30 days' > CURRENT_DATE
      `;
      
      const result = await pool.query(expiringQuery);
      
      for (const subscription of result.rows) {
        const expiryDate = new Date(subscription.billing_start_date);
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        await notifySubscriptionExpiring(subscription.user_id, {
          plan_name: subscription.plan_name,
          expiry_date: expiryDate.toLocaleDateString()
        });
      }
      
      console.log(`✅ Sent expiration warnings to ${result.rows.length} users`);
    } catch (error) {
      console.error('❌ Subscription expiration check failed:', error);
    }
  });
};

// 4. PAYMENT REMINDER (runs every 3 days for unpaid invoices)
const schedulePaymentReminders = () => {
  cron.schedule('0 14 */3 * *', async () => {
    console.log('🕑 Running payment reminder job...');
    try {
      const unpaidQuery = `
        SELECT 
          i.user_id,
          i.invoice_number,
          i.amount,
          i.due_date,
          u.username
        FROM invoices i
        JOIN users u ON i.user_id = u.user_id
        WHERE i.status = 'unpaid'
          AND i.due_date > CURRENT_DATE
          AND i.due_date <= CURRENT_DATE + INTERVAL '7 days'
      `;
      
      const result = await pool.query(unpaidQuery);
      
      for (const invoice of result.rows) {
        const daysUntilDue = Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        await createUserNotification(
          invoice.user_id,
          '💰 Payment Reminder',
          `Your payment for invoice ${invoice.invoice_number} (₱${invoice.amount}) is due in ${daysUntilDue} days. Please pay on time to avoid late fees.`,
          'payment_reminder'
        );
      }
      
      console.log(`✅ Sent payment reminders to ${result.rows.length} users`);
    } catch (error) {
      console.error('❌ Payment reminder job failed:', error);
    }
  });
};

// 5. MONTHLY INVOICE GENERATION TRIGGER (runs on 1st of every month at 8 AM)
const scheduleMonthlyInvoiceGeneration = () => {
  cron.schedule('0 8 1 * *', async () => {
    console.log('🕗 Running monthly invoice generation...');
    try {
      // This would trigger the monthly invoice generation
      // You can call your existing generateMonthlyInvoices function here
      console.log('📊 Monthly invoice generation should be triggered here');
      
      // Example API call to trigger generation
      // await fetch('http://localhost:3000/api/billing/generate-monthly', { method: 'POST' });
    } catch (error) {
      console.error('❌ Monthly invoice generation failed:', error);
    }
  });
};

// Initialize all scheduled jobs
const initializeNotificationScheduler = () => {
  console.log('🚀 Initializing automated notification scheduler...');
  
  scheduleCollectionReminders();
  scheduleOverduePaymentCheck();
  scheduleSubscriptionExpirationCheck();
  schedulePaymentReminders();
  scheduleMonthlyInvoiceGeneration();
  
  console.log('✅ All notification schedules initialized');
  console.log('📅 Scheduled jobs:');
  console.log('  - Collection reminders: Daily at 6:00 PM');
  console.log('  - Overdue payment check: Daily at 9:00 AM');
  console.log('  - Subscription expiration check: Weekly on Mondays at 10:00 AM');
  console.log('  - Payment reminders: Every 3 days at 2:00 PM');
  console.log('  - Monthly invoice generation: 1st of every month at 8:00 AM');
};

module.exports = {
  initializeNotificationScheduler,
  scheduleCollectionReminders,
  scheduleOverduePaymentCheck,
  scheduleSubscriptionExpirationCheck,
  schedulePaymentReminders,
  scheduleMonthlyInvoiceGeneration
};
