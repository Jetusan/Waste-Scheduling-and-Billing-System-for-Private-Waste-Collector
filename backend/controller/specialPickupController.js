const specialPickupModel = require('../models/specialPickupModel');
const { notifySpecialPickupRequested } = require('../services/specialPickupNotificationService');

// Create a new special pickup request
const createRequest = async (req, res) => {
  try {
    const data = req.body;
    
    // Verify user authentication (req.user is set by authenticateJWT middleware)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        message: 'User not authenticated. Please log in again.' 
      });
    }
    
    // Ensure user_id matches authenticated user
    if (data.user_id && parseInt(data.user_id) !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Cannot create request for another user.' 
      });
    }
    
    // Set user_id from authenticated user if not provided
    if (!data.user_id) {
      data.user_id = req.user.userId;
    }
    
    // Handle uploaded image
    if (req.file) {
      // Store the relative path to the uploaded file
      data.image_url = `/uploads/${req.file.filename}`;
    }
    
    // Handle bag quantity and pricing
    if (data.bag_quantity) {
      data.bag_quantity = parseInt(data.bag_quantity) || 1;
      data.price_per_bag = 25.00; // Fixed price per bag
      data.estimated_total = data.bag_quantity * 25.00;
      
      console.log(`📦 Special pickup request: ${data.bag_quantity} bags × ₱25 = ₱${data.estimated_total}`);
    }
    
    const newRequest = await specialPickupModel.createSpecialPickupRequest(data);
    
    // Send notification to user and admins
    try {
      await notifySpecialPickupRequested(newRequest.user_id, {
        request_id: newRequest.request_id,
        waste_type: newRequest.waste_type,
        location: newRequest.address,
        pickup_date: newRequest.pickup_date,
        pickup_time: newRequest.pickup_time
      });
      console.log('✅ Special pickup notifications sent successfully');
    } catch (notificationError) {
      console.error('⚠️ Failed to send special pickup notifications:', notificationError);
      // Don't fail the request creation if notification fails
    }
    
    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Error creating special pickup request:', err);
    res.status(500).json({ error: 'Failed to create special pickup request', details: err.message });
  }
};

// Get all special pickup requests (optionally filter by status)
const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await specialPickupModel.getAllSpecialPickupRequests(status);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch special pickup requests', details: err.message });
  }
};

// Get special pickup requests by user
const getRequestsByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Verify user authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        message: 'User not authenticated. Please log in again.' 
      });
    }
    
    // Ensure user can only access their own requests
    if (parseInt(user_id) !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Cannot access another user\'s requests.' 
      });
    }
    
    const requests = await specialPickupModel.getSpecialPickupRequestsByUser(user_id);
    res.json(requests);
  } catch (err) {
    console.error('Error fetching user special pickup requests:', err);
    res.status(500).json({ error: 'Failed to fetch user special pickup requests', details: err.message });
  }
};

// Get special pickup requests by collector
const getRequestsByCollector = async (req, res) => {
  try {
    const { collector_id } = req.params;
    const requests = await specialPickupModel.getSpecialPickupRequestsByCollector(collector_id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collector special pickup requests', details: err.message });
  }
};

// Update a special pickup request (status, assign collector, etc.)
const updateRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const updates = req.body;
    const updated = await specialPickupModel.updateSpecialPickupRequest(request_id, updates);
    
    if (!updated) {
      return res.status(404).json({ error: 'Special pickup request not found' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating special pickup request:', error);
    res.status(500).json({ error: 'Failed to update special pickup request' });
  }
};

// Get a specific special pickup request by ID
const getRequestById = async (req, res) => {
  try {
    const { request_id } = req.params;
    const request = await specialPickupModel.getSpecialPickupRequestById(request_id);
    if (!request) {
      return res.status(404).json({ error: 'Special pickup request not found' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch special pickup request', details: err.message });
  }
};

// Collect payment for special pickup
const collectPayment = async (req, res) => {
  try {
    const {
      request_id,
      collector_id,
      bags_collected,
      amount_collected,
      payment_method = 'cash',
      collector_notes
    } = req.body;

    // Validate required fields
    if (!request_id || !collector_id || !bags_collected || !amount_collected) {
      return res.status(400).json({ 
        error: 'Missing required fields: request_id, collector_id, bags_collected, amount_collected' 
      });
    }

    // Call the database function to collect payment
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const result = await pool.query(
      'SELECT collect_special_pickup_payment($1, $2, $3, $4, $5, $6) as result',
      [request_id, collector_id, bags_collected, amount_collected, payment_method, collector_notes]
    );

    const paymentResult = result.rows[0]?.result;
    
    if (!paymentResult || !paymentResult.success) {
      return res.status(400).json({ 
        error: paymentResult?.error || 'Failed to collect payment' 
      });
    }

    console.log(`💰 Payment collected: ₱${amount_collected} for ${bags_collected} bags (Request #${request_id})`);
    
    res.json({
      success: true,
      message: 'Payment collected successfully',
      receipt_number: paymentResult.receipt_number,
      amount_collected: paymentResult.amount_collected,
      bags_collected: paymentResult.bags_collected,
      collector_balance: paymentResult.collector_balance
    });

  } catch (error) {
    console.error('Error collecting payment:', error);
    res.status(500).json({ error: 'Failed to collect payment' });
  }
};

// Cancel a special pickup request
const cancelRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const cancelled = await specialPickupModel.updateSpecialPickupRequest(request_id, { status: 'cancelled' });
    res.json(cancelled);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel special pickup request', details: err.message });
  }
};

module.exports = {
  createRequest,
  getAllRequests,
  getRequestsByUser,
  getRequestsByCollector,
  updateRequest,
  getRequestById,
  collectPayment,
  cancelRequest
}; 