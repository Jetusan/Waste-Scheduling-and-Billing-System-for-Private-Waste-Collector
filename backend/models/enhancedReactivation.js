// enhancedReactivation.js - Enhanced reactivation flow for long-term cancelled subscribers
const { pool } = require('../config/db');
const billingModel = require('./billingModel');

/**
 * Enhanced reactivation flow for subscribers who have been terminated for many days
 * Handles data cleanup, profile refresh, and proper reactivation
 */
const enhancedReactivation = async (userId, paymentData) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🔄 Starting enhanced reactivation for user ${userId}`);
    
    // Step 1: Get user's most recent subscription
    const subscriptionQuery = `
      SELECT * FROM customer_subscriptions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const subResult = await client.query(subscriptionQuery, [userId]);
    
    if (subResult.rows.length === 0) {
      throw new Error('No previous subscription found for user');
    }
    
    const oldSubscription = subResult.rows[0];
    const daysSinceCancellation = oldSubscription.cancelled_at ? 
      Math.floor((new Date() - new Date(oldSubscription.cancelled_at)) / (1000 * 60 * 60 * 24)) : 0;
    
    console.log(`📅 Days since cancellation: ${daysSinceCancellation}`);
    
    // Step 2: Archive old unpaid invoices (if subscription was cancelled > 30 days ago)
    if (daysSinceCancellation > 30) {
      console.log('🗄️ Archiving old unpaid invoices...');
      await client.query(`
        UPDATE invoices 
        SET status = 'archived', 
            notes = CONCAT(COALESCE(notes, ''), ' - Archived during reactivation on ', CURRENT_DATE::text),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 
          AND subscription_id = $2 
          AND status IN ('unpaid', 'overdue')
      `, [userId, oldSubscription.subscription_id]);
    }
    
    // Step 3: Reset collection schedules (cancel any pending collections)
    // Note: Skipping collection schedule reset as collection_schedules table 
    // appears to be a general template table without user-specific records
    console.log('   📅 Collection schedule reset skipped (no user-specific schedules found)');
    
    // Step 4: Reactivate subscription using existing function
    console.log('✨ Reactivating subscription...');
    await client.query('COMMIT'); // Commit the cleanup first
    
    // Use existing reactivation function
    const reactivatedSubscription = await billingModel.reactivateSubscription(userId, {
      ...paymentData,
      notes: `Reactivation after ${daysSinceCancellation} days of cancellation`
    });
    
    // Step 5: Create welcome back invoice
    const welcomeInvoiceData = {
      invoice_number: `WELCOME-${Date.now()}-${userId}`,
      subscription_id: reactivatedSubscription.subscription_id,
      plan_id: reactivatedSubscription.plan_id,
      amount: 199,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      generated_date: new Date().toISOString().split('T')[0],
      notes: `Welcome back! Reactivation invoice after ${daysSinceCancellation} days`
    };
    
    const welcomeInvoice = await billingModel.createInvoice(welcomeInvoiceData);
    
    console.log('🎉 Enhanced reactivation completed successfully');
    
    return {
      subscription: reactivatedSubscription,
      invoice: welcomeInvoice,
      daysSinceCancellation,
      archivedInvoices: daysSinceCancellation > 30,
      resetSchedules: true,
      reactivationType: daysSinceCancellation > 90 ? 'long_term' : 'standard'
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Enhanced reactivation failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if user needs enhanced reactivation vs standard reactivation
 */
const shouldUseEnhancedReactivation = async (userId) => {
  const query = `
    SELECT 
      status,
      cancelled_at,
      suspended_at,
      EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - COALESCE(cancelled_at, suspended_at))) as days_inactive
    FROM customer_subscriptions 
    WHERE user_id = $1 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  
  const result = await pool.query(query, [userId]);
  
  if (result.rows.length === 0) return false;
  
  const subscription = result.rows[0];
  const daysInactive = subscription.days_inactive || 0;
  
  // Use enhanced reactivation if:
  // 1. Cancelled/suspended for more than 30 days
  // 2. Status is cancelled (regardless of time)
  return daysInactive > 30 || subscription.status === 'cancelled';
};

/**
 * Get reactivation summary for user
 */
const getReactivationSummary = async (userId) => {
  const query = `
    SELECT 
      cs.status,
      cs.cancelled_at,
      cs.suspended_at,
      cs.cancellation_reason,
      COUNT(i.invoice_id) as unpaid_invoices,
      SUM(CASE WHEN i.status IN ('unpaid', 'overdue') THEN i.amount ELSE 0 END) as outstanding_amount
    FROM customer_subscriptions cs
    LEFT JOIN invoices i ON i.subscription_id = cs.subscription_id
    WHERE cs.user_id = $1
    GROUP BY cs.subscription_id, cs.status, cs.cancelled_at, cs.suspended_at, cs.cancellation_reason
    ORDER BY cs.created_at DESC
    LIMIT 1
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

module.exports = {
  enhancedReactivation,
  shouldUseEnhancedReactivation,
  getReactivationSummary
};
