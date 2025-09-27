const express = require('express');
const router = express.Router();
const collectorController = require('../controller/collectorController');

// Get collector dashboard stats
router.get('/dashboard/stats', collectorController.getDashboardStats);

// Get last collection overview
router.get('/last-collection', collectorController.getLastCollectionOverview);

// Get collector notifications
router.get('/notifications', collectorController.getCollectorNotifications);

// Get collector schedules
router.get('/schedules', collectorController.getCollectorSchedules);

module.exports = router;
