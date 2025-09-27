const express = require('express');
const router = express.Router();
const feedbackController = require('../controller/feedbackController');

// POST /api/feedback - Create a new feedback
router.post('/', feedbackController.createFeedback);

// GET /api/feedback - Get all feedback (admin only)
router.get('/', feedbackController.getAllFeedback);

// GET /api/feedback/user/:user_id - Get feedback by user
router.get('/user/:user_id', feedbackController.getFeedbackByUser);

// GET /api/feedback/stats - Get feedback statistics
router.get('/stats', feedbackController.getFeedbackStats);

// GET /api/feedback/:feedback_id - Get feedback by ID
router.get('/:feedback_id', feedbackController.getFeedbackById);

// PUT /api/feedback/:feedback_id - Update feedback (admin only)
router.put('/:feedback_id', feedbackController.updateFeedback);

// DELETE /api/feedback/:feedback_id - Delete feedback
router.delete('/:feedback_id', feedbackController.deleteFeedback);

module.exports = router;
