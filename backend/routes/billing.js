const express = require('express');
const router = express.Router();
const billingController = require('../controller/billingController');
const { authenticateJWT } = require('../middleware/auth');
const { pool } = require('../config/db');

// GCash payment integration routes
router.post('/create-gcash-source', billingController.createGcashSource);

// Payment redirect routes (for PayMongo callbacks)
router.get('/payment-redirect/success', async (req, res) => {
  console.log('✅ Payment success redirect:', req.query);
  console.log('✅ Full request URL:', req.originalUrl);
  
  // Attempt to extract the PayMongo source ID from common query params
  const sourceId = req.query.id || req.query.source || req.query.source_id || req.query.sourceId || req.query.rid || req.query.session_id || req.query.checkout_session_id;
  
  if (sourceId) {
    try {
      await billingController.updatePaymentStatus(sourceId, 'completed');
      console.log('✅ Payment status updated to completed for source:', sourceId);
    } catch (error) {
      console.error('Error updating payment status on success redirect:', error);
    }
  } else {
    console.warn('⚠️ No sourceId found in success redirect query params:', Object.keys(req.query));
  }
  
  res.send(`
    <html>
      <head>
        <title>Payment Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          .success-icon {
            font-size: 4rem;
            margin-bottom: 20px;
          }
          h1 {
            color: #28a745;
            margin-bottom: 20px;
          }
          .countdown {
            font-weight: bold;
            color: #007bff;
            margin-top: 20px;
          }
          .close-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
          }
          .close-btn:hover {
            background: #218838;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your GCash payment has been processed successfully.</p>
          <p>Your subscription is now active.</p>
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
                type: 'PAYMENT_SUCCESS',
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

router.get('/payment-redirect/failed', async (req, res) => {
  console.log('❌ Payment failed redirect:', req.query);
  console.log('❌ Full request URL:', req.originalUrl);
  
  const sourceId = req.query.id || req.query.source || req.query.source_id || req.query.sourceId || req.query.rid;
  
  if (sourceId) {
    try {
      await billingController.updatePaymentStatus(sourceId, 'failed');
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
    console.log('📥 PayMongo webhook received:', req.body);
    
    const event = req.body.data;
    if (event && event.attributes) {
      const sourceId = event.attributes.data?.id;
      const status = event.attributes.type;
      
      if (sourceId && status) {
        console.log(`🔄 Updating payment status: ${sourceId} -> ${status}`);
        
        if (status === 'source.chargeable') {
          await billingController.updatePaymentStatus(sourceId, 'completed');
        } else if (status === 'source.failed') {
          await billingController.updatePaymentStatus(sourceId, 'failed');
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

// Mobile subscription management routes
router.post('/create-mobile-subscription', authenticateJWT, billingController.createMobileSubscription);
router.post('/mobile-subscription', authenticateJWT, billingController.createMobileSubscription); // Alternative endpoint for mobile app
router.get('/subscription-status/:user_id', billingController.getUserSubscriptionStatus);

// Payment confirmation routes
router.post('/confirm-gcash-payment', billingController.confirmGcashPayment);
router.post('/confirm-cash-payment', billingController.confirmCashPayment);

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

module.exports = router;
