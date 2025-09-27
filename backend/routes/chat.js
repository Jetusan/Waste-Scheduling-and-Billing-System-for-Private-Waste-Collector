const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const { authenticateJWT } = require('../middleware/auth');

// Get or create chat for a special pickup request
router.get('/request/:requestId', authenticateJWT, chatController.getOrCreateChat);

// Get chat messages
router.get('/:chatId/messages', authenticateJWT, chatController.getChatMessages);

// Send a message
router.post('/:chatId/messages', authenticateJWT, chatController.sendMessage);

// Mark messages as read
router.put('/:chatId/read', authenticateJWT, chatController.markMessagesAsRead);

// Get chat summary for admin dashboard
router.get('/admin/summary', authenticateJWT, chatController.getChatSummary);

module.exports = router;
