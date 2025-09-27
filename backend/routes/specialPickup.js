const express = require('express');
const router = express.Router();
const specialPickupController = require('../controller/specialPickupController');
const upload = require('../middleware/upload');

// GET /api/special-pickup - Get all special pickup requests (with optional status filter)
router.get('/', specialPickupController.getAllRequests);

// POST /api/special-pickup - Create a new special pickup request with image upload
router.post('/', upload.single('image'), specialPickupController.createRequest);

// GET /api/special-pickup/user/:user_id - Get requests by user
router.get('/user/:user_id', specialPickupController.getRequestsByUser);

// GET /api/special-pickup/collector/:collector_id - Get requests by collector
router.get('/collector/:collector_id', specialPickupController.getRequestsByCollector);

// PUT /api/special-pickup/:request_id - Update a special pickup request
router.put('/:request_id', specialPickupController.updateRequest);

// DELETE /api/special-pickup/:request_id - Cancel a special pickup request
router.delete('/:request_id', specialPickupController.cancelRequest);

// GET /api/special-pickup/:request_id - Get specific request details
router.get('/:request_id', specialPickupController.getRequestById);

module.exports = router;
