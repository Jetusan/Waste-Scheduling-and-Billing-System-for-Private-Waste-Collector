const express = require('express');
const router = express.Router();
const transactionHistoryController = require('../controller/transactionHistoryController');
const { authenticateJWT } = require('../middleware/auth');

// Get user's transaction history
router.get('/history', authenticateJWT, transactionHistoryController.getUserTransactionHistory);
router.get('/history/:user_id', authenticateJWT, transactionHistoryController.getUserTransactionHistory);

// Get user's transaction summary/stats
router.get('/summary', authenticateJWT, transactionHistoryController.getUserTransactionSummary);
router.get('/summary/:user_id', authenticateJWT, transactionHistoryController.getUserTransactionSummary);

module.exports = router;
