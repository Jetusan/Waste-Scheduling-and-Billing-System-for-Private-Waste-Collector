const express = require('express');
const router = express.Router();
const billingController = require('../controller/billingController');

// GCash payment integration routes
router.post('/create-gcash-source', billingController.createGcashSource);

// Payment redirect routes (for PayMongo callbacks)
router.get('/payment-redirect/success', (req, res) => {
  console.log('✅ Payment success redirect:', req.query);
  res.send(`
    <html>
      <head><title>Payment Successful</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: green;">✅ Payment Successful!</h1>
        <p>Your payment has been processed successfully.</p>
        <p>You can now close this window and return to the app.</p>
        <script>
          // Try to close the window after a delay
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
    </html>
  `);
});

router.get('/payment-redirect/failed', (req, res) => {
  console.log('❌ Payment failed redirect:', req.query);
  res.send(`
    <html>
      <head><title>Payment Failed</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: red;">❌ Payment Failed</h1>
        <p>Your payment could not be processed.</p>
        <p>Please try again or contact support if the problem persists.</p>
        <script>
          // Try to close the window after a delay
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
    </html>
  `);
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

module.exports = router;
