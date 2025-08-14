const express = require('express');
const router = express.Router();
const billingController = require('../controller/billingController');

// GCash payment integration routes
router.post('/create-gcash-source', billingController.createGcashSource);

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
