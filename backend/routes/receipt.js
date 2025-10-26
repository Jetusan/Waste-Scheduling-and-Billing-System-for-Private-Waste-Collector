const express = require('express');
const router = express.Router();
const receiptController = require('../controller/receiptController');
const { authenticateJWT } = require('../middleware/auth');

// Generate receipt for completed payment
router.get('/generate', receiptController.generateReceipt);

// Get receipts for a user (transaction history)
router.get('/user/:userId', authenticateJWT, receiptController.getUserReceipts);

// Get specific receipt by ID
router.get('/:receiptId', receiptController.getReceiptById);

// Download receipt as text/JSON
router.get('/download/:receiptId', authenticateJWT, receiptController.downloadReceipt);

module.exports = router;
