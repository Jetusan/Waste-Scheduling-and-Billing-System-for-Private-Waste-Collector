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
    message,
    pickup_latitude,
    pickup_longitude,
    bag_quantity,
    price_per_bag,
    estimated_total
  } = data;
  const query = `
    INSERT INTO special_pickup_requests
      (user_id, waste_type, description, pickup_date, pickup_time, address, notes, image_url, message, pickup_latitude, pickup_longitude, bag_quantity, price_per_bag, estimated_total)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;
  const values = [
    user_id, waste_type, description, pickup_date, pickup_time || null, 
    address, notes, image_url, message, pickup_latitude, pickup_longitude,
    bag_quantity || 1, price_per_bag || 25.00, estimated_total || 25.00
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all special pickup requests (optionally filter by status)
const getAllSpecialPickupRequests = async (status) => {
  let query = `
    SELECT spr.*, 
           COALESCE(un.first_name || ' ' || un.last_name, u.username, 'Unknown User') as user_name,
           u.username
    FROM special_pickup_requests spr
    LEFT JOIN users u ON spr.user_id = u.user_id
    LEFT JOIN user_names un ON u.name_id = un.name_id
  `;
  let values = [];
  if (status) {
    query += ' WHERE spr.status = $1';
    values.push(status);
  }
  query += ' ORDER BY spr.created_at DESC';
  const result = await pool.query(query, values);
  return result.rows;
};

// Get special pickup requests by collector
const getSpecialPickupRequestsByCollector = async (collector_id) => {
  const query = `
    SELECT spr.*, 
           COALESCE(un.first_name || ' ' || un.last_name, u.username, 'Unknown User') as user_name,
           u.username
    FROM special_pickup_requests spr
    LEFT JOIN users u ON spr.user_id = u.user_id
    LEFT JOIN user_names un ON u.name_id = un.name_id
    WHERE spr.collector_id = $1 
    ORDER BY spr.created_at DESC
  `;
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