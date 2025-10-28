const express = require('express');
const router = express.Router();
const specialPickupController = require('../controller/specialPickupController');
const upload = require('../middleware/upload');
const { authenticateJWT } = require('../middleware/auth');
const { validators } = require('../middleware/validationMiddleware');

// GET /api/special-pickup - Get all special pickup requests (with optional status filter)
router.get('/', specialPickupController.getAllRequests);

// POST /api/special-pickup - Create a new special pickup request with validation and image upload
router.post('/', 
  authenticateJWT, 
  upload.single('image'),
  ...validators.specialPickupRequest,
  specialPickupController.createRequest
);

// GET /api/special-pickup/user/:user_id - Get requests by user with validation
router.get('/user/:user_id', 
  authenticateJWT, 
  validators.userId,
  specialPickupController.getRequestsByUser
);

// GET /api/special-pickup/collector/:collector_id - Get requests by collector
router.get('/collector/:collector_id', specialPickupController.getRequestsByCollector);

// POST /api/special-pickup/collect-payment - Collect payment for special pickup
router.post('/collect-payment', specialPickupController.collectPayment);

// PUT /api/special-pickup/:request_id - Update a special pickup request
router.put('/:request_id', specialPickupController.updateRequest);

// DELETE /api/special-pickup/:request_id - Cancel a special pickup request
router.delete('/:request_id', specialPickupController.cancelRequest);

// GET /api/special-pickup/:request_id - Get specific request details
router.get('/:request_id', specialPickupController.getRequestById);

module.exports = router;
