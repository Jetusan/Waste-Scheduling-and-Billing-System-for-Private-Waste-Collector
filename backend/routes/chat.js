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

// Get unread message count for a specific chat
router.get('/:chatId/unread-count', authenticateJWT, chatController.getUnreadCount);

// Get unread message count for admin
router.get('/:chatId/unread-count-admin', authenticateJWT, chatController.getUnreadCountAdmin);

module.exports = router;
