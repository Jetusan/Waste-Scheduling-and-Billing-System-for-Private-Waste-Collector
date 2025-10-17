const express = require('express');
const router = express.Router();
const billingController = require('../controller/billingController');
const subscriptionStatusController = require('../controller/subscriptionStatusController');
const { authenticateJWT } = require('../middleware/auth');
const { pool } = require('../config/db');

// GCash payment integration routes
router.post('/create-gcash-source', billingController.createGcashSource);

// Mobile payment redirect routes (for PayMongo callbacks to mobile app)
router.get('/mobile-payment-success', async (req, res) => {
  console.log('📱 Mobile payment success redirect:', req.query);
  
  // Extract parameters
  const sourceId = req.query.id || req.query.source || req.query.source_id || req.query.sourceId;
  const subscriptionId = req.query.subscription_id || req.query.subscriptionId;
  
  try {
    // Process the payment success (similar to web success handler)
    if (sourceId) {
      // Update payment status in database
      const updateQuery = `
        UPDATE payment_sources 
        SET status = 'chargeable', updated_at = NOW() 
        WHERE source_id = $1
        RETURNING *;
      `;
      await pool.query(updateQuery, [sourceId]);
      
      // Activate subscription if needed
      if (subscriptionId) {
        const activateQuery = `
          UPDATE customer_subscriptions 
          SET status = 'active', payment_status = 'paid', updated_at = NOW()
          WHERE subscription_id = $1;
        `;
        await pool.query(activateQuery, [subscriptionId]);
      }
    }
    
    // Redirect to mobile app with success deep link
    const deepLink = `wsbs://payment/success?source_id=${sourceId}&subscription_id=${subscriptionId}&status=success`;
    res.redirect(deepLink);
    
  } catch (error) {
    console.error('❌ Mobile payment success error:', error);
    const errorDeepLink = `wsbs://payment/failed?error=processing_error`;
    res.redirect(errorDeepLink);
  }
});

router.get('/mobile-payment-failed', async (req, res) => {
  console.log('📱 Mobile payment failed redirect:', req.query);
  
  const subscriptionId = req.query.subscription_id || req.query.subscriptionId;
  const errorDeepLink = `wsbs://payment/failed?subscription_id=${subscriptionId}&status=failed`;
  res.redirect(errorDeepLink);
});

// Payment redirect routes (for PayMongo callbacks)
router.get('/payment-redirect/success', async (req, res) => {
  console.log('✅ Payment success redirect:', req.query);
  console.log('✅ Full request URL:', req.originalUrl);
  
  // Attempt to extract the PayMongo source ID from common query params
  let sourceId = req.query.id || req.query.source || req.query.source_id || req.query.sourceId || req.query.rid || req.query.session_id || req.query.checkout_session_id;
  const subscriptionId = req.query.subscription_id || req.query.subscriptionId;

  // Fallback: if no sourceId but we have subscriptionId, resolve the latest payment_source
  if (!sourceId && subscriptionId) {
    try {
      const fallbackQuery = `
        WITH latest_unpaid AS (
          SELECT invoice_id FROM invoices 
          WHERE subscription_id = $1 AND status = 'unpaid' 
          ORDER BY created_at DESC 
          LIMIT 1
        )
        SELECT ps.source_id
        FROM payment_sources ps
        JOIN latest_unpaid lu ON ps.invoice_id = lu.invoice_id
        ORDER BY ps.created_at DESC
        LIMIT 1;
      `;
      const fallbackRes = await pool.query(fallbackQuery, [subscriptionId]);
      if (fallbackRes.rows.length > 0) {
        sourceId = fallbackRes.rows[0].source_id;
        console.log('🔎 Fallback resolved sourceId via subscription:', { subscriptionId, sourceId });
      } else {
        console.warn('⚠️ Fallback could not resolve sourceId for subscription:', subscriptionId);
      }
    } catch (e) {
      console.error('❌ Error during fallback source resolution:', e.message);
    }
  }
  
  if (sourceId) {
    try {
      // If subscription_id is present, ensure payment_sources.invoice_id is linked to the latest unpaid invoice
      if (subscriptionId) {
        try {
          const linkRes = await pool.query(
            `WITH latest_unpaid AS (
               SELECT invoice_id FROM invoices 
               WHERE subscription_id = $1 AND status = 'unpaid' 
               ORDER BY created_at DESC 
               LIMIT 1
             )
             UPDATE payment_sources ps
             SET invoice_id = lu.invoice_id, updated_at = CURRENT_TIMESTAMP
             FROM latest_unpaid lu
             WHERE ps.source_id = $2 AND (ps.invoice_id IS NULL)
             RETURNING ps.source_id, ps.invoice_id`,
            [subscriptionId, sourceId]
          );
          if (linkRes.rows.length > 0) {
            console.log('🔗 Linked payment_source to invoice on success redirect:', linkRes.rows[0]);
          } else {
            console.warn('⚠️ Could not link payment_source to invoice (maybe already linked or no unpaid invoice).');
          }
        } catch (e) {
          console.error('⚠️ Error linking payment_source to invoice on redirect:', e.message);
        }
      }

      await billingController.updatePaymentStatus(sourceId, 'completed', null);
      console.log('✅ Payment status updated to completed for source:', sourceId);
    } catch (error) {
      console.error('Error updating payment status on success redirect:', error);
    }
  } else {
    console.warn('⚠️ No sourceId found in success redirect query params:', Object.keys(req.query));
  }
  
  // Try to find source_id from database if not in URL params
  if (!sourceId && subscriptionId) {
    try {
      console.log('🔍 Trying to find source_id from database for subscription:', subscriptionId);
      const sourceQuery = await pool.query(`
        SELECT ps.source_id 
        FROM payment_sources ps
        JOIN invoices i ON ps.invoice_id = i.invoice_id
        WHERE i.subscription_id = $1 
        ORDER BY ps.created_at DESC 
        LIMIT 1
      `, [subscriptionId]);
      
      if (sourceQuery.rows.length > 0) {
        sourceId = sourceQuery.rows[0].source_id;
        console.log('✅ Found source_id from database:', sourceId);
      }
    } catch (error) {
      console.error('❌ Error finding source_id from database:', error.message);
    }
  }

  // Generate receipt with available data
  if (sourceId) {
    res.redirect(`/api/receipt/generate?source_id=${sourceId}${subscriptionId ? `&subscription_id=${subscriptionId}` : ''}`);
  } else if (subscriptionId) {
    res.redirect(`/api/receipt/generate?subscription_id=${subscriptionId}`);
  } else {
    // Create a simple success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; font-size: 16px; line-height: 1.5; }
          .btn { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; margin-top: 20px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅ Payment Successful!</div>
          <div class="message">
            Your GCash payment has been processed successfully. Your subscription is now active.
            <br><br>
            Your receipt will be available in your account shortly.
          </div>
          <button class="btn" onclick="window.close()">Close</button>
        </div>
        <script>
          setTimeout(() => {
            if (window.opener) window.close();
          }, 5000);
        </script>
      </body>
      </html>
    `);
  }
});

router.get('/payment-redirect/failed', async (req, res) => {
  console.log('❌ Payment failed redirect:', req.query);
  console.log('❌ Full request URL:', req.originalUrl);
  
  const sourceId = req.query.id || req.query.source || req.query.source_id || req.query.sourceId || req.query.rid;
  
  if (sourceId) {
    try {
      await billingController.updatePaymentStatus(sourceId, 'failed', null);
      console.log('✅ Payment status updated to failed for source:', sourceId);
    } catch (error) {
      console.error('Error updating payment status on failed redirect:', error);
    }
  } else {
    console.warn('⚠️ No sourceId found in failed redirect query params:', Object.keys(req.query));
  }
  
  res.send(`
    <html>
      <head>
        <title>Payment Failed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
          }
          h1 {
            color: #dc3545;
            margin-bottom: 20px;
          }
          .countdown {
            font-weight: bold;
            color: #007bff;
            margin-top: 20px;
          }
          .close-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
          }
          .close-btn:hover {
            background: #c82333;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <h1>Payment Failed</h1>
          <p>Your GCash payment could not be processed.</p>
          <p>Please try again or contact support if the problem persists.</p>
          <div class="countdown">This window will close automatically in <span id="timer">5</span> seconds</div>
          <button class="close-btn" onclick="closeWindow()">Close Now</button>
        </div>
        <script>
          let countdown = 5;
          const timer = document.getElementById('timer');
          
          function updateTimer() {
            timer.textContent = countdown;
            countdown--;
            
            if (countdown < 0) {
              closeWindow();
            }
          }
          
          function closeWindow() {
            try {
              window.close();
            } catch (e) {
              // If window.close() fails, redirect to a safe page
              window.location.href = 'about:blank';
            }
          }
          
          // Update timer every second
          const interval = setInterval(updateTimer, 1000);
          updateTimer();
          
          // Also try to communicate with parent window if in iframe
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: 'PAYMENT_FAILED',
                sourceId: '${sourceId || 'unknown'}'
              }, '*');
            }
          } catch (e) {
            console.log('Could not communicate with parent window');
          }
        </script>
      </body>
    </html>
  `);
});

// PayMongo webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    console.log('📥 PayMongo webhook received:', JSON.stringify(req.body, null, 2));
    
    const event = req.body;
    if (event && event.data && event.data.attributes) {
      const sourceId = event.data.id;
      const eventType = event.data.attributes.type;
      
      console.log(`🔄 Processing webhook: ${eventType} for source: ${sourceId}`);
      
      if (sourceId && eventType) {
        if (eventType === 'source.chargeable') {
          console.log('✅ Payment successful, updating status to completed');
          await billingController.updatePaymentStatus(sourceId, 'completed', event);
        } else if (eventType === 'source.failed' || eventType === 'source.cancelled') {
          console.log('❌ Payment failed, updating status to failed');
          await billingController.updatePaymentStatus(sourceId, 'failed', event);
        }
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payment status routes
router.get('/payment-status/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const status = await billingController.getPaymentStatus(sourceId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/update-payment-status', async (req, res) => {
  try {
    const { sourceId, status } = req.body;
    await billingController.updatePaymentStatus(sourceId, status);
    res.json({ success: true, message: 'Payment status updated' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Subscription plans (used by admin Billing.jsx)
router.get('/subscription-plans', billingController.getAllSubscriptionPlans);

// Customer subscriptions (used by admin Billing.jsx)
router.get('/subscriptions', billingController.getAllCustomerSubscriptions);

// Mobile subscription management routes
router.post('/create-mobile-subscription', authenticateJWT, billingController.createMobileSubscription);
router.post('/mobile-subscription', authenticateJWT, billingController.createMobileSubscription); // Alternative endpoint for mobile app
router.get('/subscription-status/:user_id', billingController.getUserSubscriptionStatus);

// Payment confirmation routes
router.post('/confirm-gcash-payment', billingController.confirmGcashPayment);
router.post('/confirm-cash-payment', billingController.confirmCashPayment);

// Manual cancellation route (mobile app)
router.post('/cancel-subscription', authenticateJWT, billingController.cancelSubscription);

// Invoices routes
router.get('/invoices', billingController.getAllInvoices);
router.get('/invoices/:invoiceId', billingController.getInvoiceById);
router.get('/invoices/:invoiceId/payments', billingController.getPaymentsByInvoiceId);

// Update invoice late fees (used by admin Billing.jsx)
router.put('/invoices/:invoiceId/late-fees', billingController.addLateFees);

// Create payment for an invoice (used by admin Billing.jsx)
router.post('/payments', billingController.createPayment);

// Get user's invoice data for mobile app
router.get('/user-invoice/:user_id', authenticateJWT, async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Get user's latest subscription and invoice
    const query = `
      SELECT 
        i.invoice_id,
        i.invoice_number,
        sp.price,
        i.due_date,
        i.generated_date,
        i.status,
        i.notes,
        cs.subscription_id,
        sp.plan_name,
        sp.description,
        sp.frequency
      FROM invoices i
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = $1
      ORDER BY i.created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No invoice found for user' });
    }
    
    const invoice = result.rows[0];
    
    res.json({
      success: true,
      invoice: {
        invoice_id: invoice.invoice_id,
        invoice_number: invoice.invoice_number,
        amount: parseFloat(invoice.price),
        due_date: invoice.due_date,
        generated_date: invoice.generated_date,
        status: invoice.status,
        notes: invoice.notes,
        plan: {
          name: invoice.plan_name,
          description: invoice.description,
          frequency: invoice.frequency
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching user invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice data' });
  }
});

// Get pending cash subscriptions for collectors
router.get('/pending-cash-subscriptions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const subscriptions = await billingController.getPendingCashSubscriptions();
    res.json({ success: true, subscriptions });
  } catch (error) {
    console.error('Error fetching pending cash subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch pending subscriptions' });
  }
});

// Subscription status for mobile app
router.get('/subscription-status/:user_id', authenticateJWT, subscriptionStatusController.getSubscriptionStatus);

// Fetch latest subscription payment method for multiple users
// GET /api/billing/subscriptions/payment-methods?user_ids=1,2,3
router.get('/subscriptions/payment-methods', authenticateJWT, async (req, res) => {
  try {
    const { user_ids } = req.query;
    if (!user_ids) {
      return res.status(400).json({ success: false, message: 'user_ids query parameter is required' });
    }

    const ids = String(user_ids)
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid user_ids provided' });
    }

    // Pick latest subscription per user via DISTINCT ON, include plan details
    const query = `
      SELECT DISTINCT ON (cs.user_id)
        cs.user_id,
        cs.subscription_id,
        cs.payment_method,
        cs.status,
        cs.payment_status,
        cs.payment_confirmed_at,
        sp.plan_name,
        sp.price,
        sp.frequency
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = ANY($1::int[])
      ORDER BY cs.user_id, cs.created_at DESC
    `;

    const result = await pool.query(query, [ids]);

    // Build a map-like response keyed by user_id
    const data = result.rows.map((r) => ({
      user_id: r.user_id,
      subscription_id: r.subscription_id,
      payment_method: r.payment_method, // expected values: 'gcash' | 'cash'
      status: r.status,
      payment_status: r.payment_status,
      payment_confirmed_at: r.payment_confirmed_at,
      plan_name: r.plan_name,
      price: r.price != null ? parseFloat(r.price) : null,
      frequency: r.frequency
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment methods', details: error.message });
  }
});

// Billing history (used by admin BillingHistory.jsx)
router.get('/history', billingController.getBillingHistory);

// Generate monthly invoices (admin function)
router.post('/generate-monthly-invoices', billingController.generateMonthlyInvoices);

// Payment Attempt Tracking Routes
router.post('/payment-attempt', authenticateJWT, billingController.recordPaymentAttempt);
router.get('/payment-attempts/:subscription_id', authenticateJWT, billingController.getPaymentAttempts);
router.get('/payment-attempt-analytics', authenticateJWT, billingController.getPaymentAttemptAnalytics);

module.exports = router;
