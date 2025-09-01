const pool = require('../config/db');

// Create a new special pickup request
const createSpecialPickupRequest = async (data) => {
  const {
    user_id,
    waste_type,
    description,
    pickup_date,
    pickup_time,
    address,
    notes,
    image_url,
    message
  } = data;
  const query = `
    INSERT INTO special_pickup_requests
      (user_id, waste_type, description, pickup_date, pickup_time, address, notes, image_url, message)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const values = [user_id, waste_type, description, pickup_date, pickup_time, address, notes, image_url, message];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all special pickup requests (optionally filter by status)
const getAllSpecialPickupRequests = async (status) => {
  let query = 'SELECT * FROM special_pickup_requests';
  let values = [];
  if (status) {
    query += ' WHERE status = $1';
    values.push(status);
  }
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, values);
  return result.rows;
};

// Get special pickup requests by collector
const getSpecialPickupRequestsByCollector = async (collector_id) => {
  const query = 'SELECT * FROM special_pickup_requests WHERE collector_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [collector_id]);
  return result.rows;
};

// Get special pickup requests by user
const getSpecialPickupRequestsByUser = async (user_id) => {
  const query = 'SELECT * FROM special_pickup_requests WHERE user_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

// Update status or assign collector
const updateSpecialPickupRequest = async (request_id, updates) => {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key in updates) {
    fields.push(`${key} = $${idx}`);
    values.push(updates[key]);
    idx++;
  }
  values.push(request_id);
  const query = `UPDATE special_pickup_requests SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE request_id = $${idx} RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get a specific special pickup request by ID
const getSpecialPickupRequestById = async (request_id) => {
  const query = 'SELECT * FROM special_pickup_requests WHERE request_id = $1';
  const result = await pool.query(query, [request_id]);
  return result.rows[0];
};

module.exports = {
  createSpecialPickupRequest,
  getAllSpecialPickupRequests,
  getSpecialPickupRequestsByCollector,
  getSpecialPickupRequestsByUser,
  updateSpecialPickupRequest,
  getSpecialPickupRequestById
}; 