const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');

// Create mobile subscription
router.post('/create-mobile-subscription', authenticateJWT, async (req, res) => {
  try {
    const { plan_id = 3 } = req.body; // Default to Full Plan (plan_id = 3)
    const user_id = req.user?.user_id || req.user?.userId;

    console.log('🔄 Creating mobile subscription for user:', user_id);

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication failed. Please log in again.'
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await pool.query(
      `SELECT subscription_id, status, payment_status 
       FROM customer_subscriptions 
       WHERE user_id = $1 AND status IN ('active', 'pending_payment')
       ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    if (existingSubscription.rows.length > 0) {
      const existing = existingSubscription.rows[0];
      console.log('📋 Found existing subscription:', existing);
      
      return res.json({
        success: true,
        subscription: {
          subscription_id: existing.subscription_id,
          status: existing.status,
          payment_status: existing.payment_status,
          message: 'Using existing subscription'
        }
      });
    }

    // Create new subscription
    const subscriptionResult = await pool.query(
      `INSERT INTO customer_subscriptions (
        user_id, 
        plan_id, 
        status, 
        payment_status, 
        created_at,
        updated_at
      ) VALUES ($1, $2, 'pending_payment', 'unpaid', NOW(), NOW())
      RETURNING subscription_id, status, payment_status`,
      [user_id, plan_id]
    );

    const newSubscription = subscriptionResult.rows[0];
    console.log('✅ Created new subscription:', newSubscription);

    res.json({
      success: true,
      subscription: {
        subscription_id: newSubscription.subscription_id,
        status: newSubscription.status,
        payment_status: newSubscription.payment_status,
        message: 'New subscription created successfully'
      }
    });

  } catch (error) {
    console.error('❌ Error creating mobile subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      details: error.message
    });
  }
});

// Get user's current subscription status
router.get('/status', authenticateJWT, async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.user?.userId;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication failed'
      });
    }

    const subscriptionQuery = `
      SELECT 
        cs.subscription_id,
        cs.status,
        cs.payment_status,
        cs.created_at,
        cs.updated_at,
        sp.plan_name,
        sp.price,
        COUNT(i.invoice_id) as total_invoices,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices
      FROM customer_subscriptions cs
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id
      WHERE cs.user_id = $1
      GROUP BY cs.subscription_id, cs.status, cs.payment_status, cs.created_at, cs.updated_at, sp.plan_name, sp.price
      ORDER BY cs.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(subscriptionQuery, [user_id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No subscription found'
      });
    }

    res.json({
      success: true,
      subscription: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
      details: error.message
    });
  }
});

module.exports = router;
