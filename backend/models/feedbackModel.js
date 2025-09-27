const pool = require('../config/db');

// Create a new feedback
const createFeedback = async (data) => {
  const {
    user_id,
    rating,
    feedback_text,
    category = 'general'
  } = data;

  const query = `
    INSERT INTO feedback (user_id, rating, feedback_text, category)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const values = [user_id, rating, feedback_text, category];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all feedback (for admin)
const getAllFeedback = async (status = null, limit = null, offset = 0) => {
  let query = `
    SELECT f.*, un.first_name, un.last_name, u.username
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    LEFT JOIN user_names un ON u.name_id = un.name_id
  `;
  
  const values = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    query += ` WHERE f.status = $${paramCount}`;
    values.push(status);
  }

  query += ` ORDER BY f.created_at DESC`;

  if (limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

// Get feedback by user
const getFeedbackByUser = async (user_id) => {
  const query = `
    SELECT * FROM feedback
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

// Get feedback by ID
const getFeedbackById = async (feedback_id) => {
  const query = `
    SELECT f.*, un.first_name, un.last_name, u.username
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    LEFT JOIN user_names un ON u.name_id = un.name_id
    WHERE f.feedback_id = $1
  `;
  
  const result = await pool.query(query, [feedback_id]);
  return result.rows[0];
};

// Update feedback status and admin response
const updateFeedback = async (feedback_id, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 0;

  for (const key in updates) {
    if (updates.hasOwnProperty(key)) {
      paramCount++;
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  paramCount++;
  values.push(feedback_id);

  const query = `
    UPDATE feedback 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE feedback_id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete feedback
const deleteFeedback = async (feedback_id) => {
  const query = 'DELETE FROM feedback WHERE feedback_id = $1 RETURNING *';
  const result = await pool.query(query, [feedback_id]);
  return result.rows[0];
};

// Get feedback statistics
const getFeedbackStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_feedback,
      AVG(rating) as average_rating,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_count,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
    FROM feedback
  `;
  
  const result = await pool.query(query);
  return result.rows[0];
};

module.exports = {
  createFeedback,
  getAllFeedback,
  getFeedbackByUser,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats
};
