const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT } = require('../middleware/auth');
const routeOptimizationService = require('../services/routeOptimizationService');

/**
 * Enhanced Collector Assignments with Route Optimization and Payment Filtering
 * This endpoint provides optimized routes and filters out paid collections unless due
 */

// GET /api/enhanced-collector/assignments/optimized-route
router.get('/assignments/optimized-route', authenticateJWT, async (req, res) => {
  try {
    const { collector_id, barangay_id, subdivision } = req.query;
    
    if (!collector_id) {
      return res.status(400).json({ error: 'collector_id is required' });
    }

    console.log(`🗺️ Getting optimized route for collector ${collector_id}`);

    // Get optimized route with payment filtering
    const optimizedRoute = await routeOptimizationService.getOptimizedCollectorRoute(
      collector_id, 
      barangay_id, 
      subdivision
    );

    // Filter out residents who have paid unless their next billing is due
    const filteredStops = await filterPaidCollections(optimizedRoute.optimized_stops);

    // Get route suggestions for improvement
    const suggestions = await routeOptimizationService.getRouteSuggestions(collector_id, filteredStops);

    res.json({
      success: true,
      assignment: {
        collector_id: collector_id,
        barangay_id: barangay_id,
        subdivision: subdivision,
        total_stops: filteredStops.length,
        route_optimized: true
      },
      stops: filteredStops,
      route_statistics: {
        ...optimizedRoute.route_statistics,
        total_stops: filteredStops.length,
        filtered_paid_collections: optimizedRoute.optimized_stops.length - filteredStops.length
      },
      optimization_notes: optimizedRoute.optimization_notes,
      route_suggestions: suggestions
    });

  } catch (error) {
    console.error('❌ Error getting optimized route:', error);
    res.status(500).json({ 
      error: 'Failed to get optimized route', 
      details: error.message 
    });
  }
});

// Filter out paid collections unless due for next billing
const filterPaidCollections = async (stops) => {
  if (!stops || stops.length === 0) return [];

  const filteredStops = [];
  
  for (const stop of stops) {
    try {
      // Check if user has active subscription and payment status
      const paymentStatusQuery = `
        SELECT 
          cs.status as subscription_status,
          cs.payment_status,
          cs.next_billing_date,
          cs.billing_cycle_count,
          i.status as invoice_status,
          i.due_date,
          i.amount,
          sp.price as plan_price
        FROM customer_subscriptions cs
        LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id 
          AND i.status IN ('unpaid', 'overdue', 'partially_paid')
        WHERE cs.user_id = $1 
          AND cs.status IN ('active', 'pending_payment')
        ORDER BY i.created_at DESC
        LIMIT 1
      `;
      
      const paymentResult = await pool.query(paymentStatusQuery, [stop.user_id]);
      
      if (paymentResult.rows.length === 0) {
        // No active subscription, skip this stop
        continue;
      }
      
      const paymentInfo = paymentResult.rows[0];
      
      // Include stop if:
      // 1. Has unpaid/overdue invoice, OR
      // 2. Next billing date is today or overdue, OR
      // 3. Subscription is pending_payment
      const today = new Date().toISOString().split('T')[0];
      const nextBillingDate = paymentInfo.next_billing_date;
      const dueDate = paymentInfo.due_date;
      
      const shouldInclude = 
        paymentInfo.invoice_status === 'unpaid' ||
        paymentInfo.invoice_status === 'overdue' ||
        paymentInfo.invoice_status === 'partially_paid' ||
        paymentInfo.subscription_status === 'pending_payment' ||
        (nextBillingDate && nextBillingDate <= today) ||
        (dueDate && dueDate <= today);
      
      if (shouldInclude) {
        // Add payment information to stop
        const enhancedStop = {
          ...stop,
          payment_info: {
            subscription_status: paymentInfo.subscription_status,
            payment_status: paymentInfo.payment_status,
            invoice_status: paymentInfo.invoice_status,
            amount_due: paymentInfo.amount || paymentInfo.plan_price,
            due_date: paymentInfo.due_date,
            next_billing_date: paymentInfo.next_billing_date,
            is_overdue: paymentInfo.due_date && paymentInfo.due_date < today,
            billing_cycle: paymentInfo.billing_cycle_count || 0
          }
        };
        
        filteredStops.push(enhancedStop);
      }
      
    } catch (error) {
      console.warn(`⚠️ Error checking payment status for user ${stop.user_id}:`, error.message);
      // Include stop if we can't determine payment status (safer approach)
      filteredStops.push(stop);
    }
  }
  
  console.log(`📊 Filtered ${stops.length} stops to ${filteredStops.length} (removed ${stops.length - filteredStops.length} paid collections)`);
  
  return filteredStops;
};

// GET /api/enhanced-collector/payment-summary/:userId
router.get('/payment-summary/:userId', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const summaryQuery = `
      SELECT 
        cs.subscription_id,
        cs.status as subscription_status,
        cs.payment_status,
        cs.payment_method,
        cs.next_billing_date,
        cs.billing_cycle_count,
        sp.plan_name,
        sp.price,
        i.invoice_id,
        i.invoice_number,
        i.amount as invoice_amount,
        i.status as invoice_status,
        i.due_date,
        i.created_at as invoice_date,
        CASE 
          WHEN i.due_date < CURRENT_DATE THEN 'overdue'
          WHEN i.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
          ELSE 'normal'
        END as urgency_level
      FROM customer_subscriptions cs
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id 
        AND i.status IN ('unpaid', 'overdue', 'partially_paid')
      WHERE cs.user_id = $1 
        AND cs.status IN ('active', 'pending_payment')
      ORDER BY i.created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(summaryQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        has_active_subscription: false,
        message: 'No active subscription or outstanding payments'
      });
    }
    
    const summary = result.rows[0];
    
    res.json({
      has_active_subscription: true,
      subscription: {
        subscription_id: summary.subscription_id,
        status: summary.subscription_status,
        payment_status: summary.payment_status,
        payment_method: summary.payment_method,
        plan_name: summary.plan_name,
        plan_price: summary.price,
        billing_cycle: summary.billing_cycle_count,
        next_billing_date: summary.next_billing_date
      },
      outstanding_invoice: summary.invoice_id ? {
        invoice_id: summary.invoice_id,
        invoice_number: summary.invoice_number,
        amount: summary.invoice_amount,
        status: summary.invoice_status,
        due_date: summary.due_date,
        urgency_level: summary.urgency_level,
        days_overdue: summary.due_date ? 
          Math.max(0, Math.floor((new Date() - new Date(summary.due_date)) / (1000 * 60 * 60 * 24))) : 0
      } : null
    });
    
  } catch (error) {
    console.error('❌ Error getting payment summary:', error);
    res.status(500).json({ 
      error: 'Failed to get payment summary', 
      details: error.message 
    });
  }
});

module.exports = router;
