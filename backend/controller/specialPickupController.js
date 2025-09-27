const specialPickupModel = require('../models/specialPickupModel');

// Create a new special pickup request
const createRequest = async (req, res) => {
  try {
    const data = req.body;
    
    // Handle uploaded image
    if (req.file) {
      // Store the relative path to the uploaded file
      data.image_url = `/uploads/${req.file.filename}`;
    }
    
    const newRequest = await specialPickupModel.createSpecialPickupRequest(data);
    res.status(201).json(newRequest);
  } catch (err) {
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
    const requests = await specialPickupModel.getSpecialPickupRequestsByUser(user_id);
    res.json(requests);
  } catch (err) {
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
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update special pickup request', details: err.message });
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
  cancelRequest
}; 