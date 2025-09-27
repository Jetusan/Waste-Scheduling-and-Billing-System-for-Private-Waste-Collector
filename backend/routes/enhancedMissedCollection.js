const express = require('express');
const router = express.Router();
const {
  reportEnhancedMissedCollection,
  getCollectorCatchupTasks,
  completeCatchupTask,
  getMissedCollectionAnalytics
} = require('../controller/enhancedMissedCollectionController');
const { authenticateJWT } = require('../middleware/auth');

// Report enhanced missed collection with dynamic issue types
router.post('/report', authenticateJWT, reportEnhancedMissedCollection);

// Get collector's catch-up tasks
router.get('/catchup-tasks', authenticateJWT, getCollectorCatchupTasks);

// Complete a catch-up task
router.post('/catchup-tasks/complete', authenticateJWT, completeCatchupTask);

// Get missed collection analytics (admin)
router.get('/analytics', authenticateJWT, getMissedCollectionAnalytics);

module.exports = router;
