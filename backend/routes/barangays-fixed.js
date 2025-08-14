const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');

// GET /api/barangays - Get all barangays for dropdown
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT barangay_id, barangay_name FROM barangays ORDER BY barangay_name';
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching barangays:', error);
    res.status(500).json({ 
      error: 'Failed to fetch barangays',
      message: error.message 
    });
  }
});

module.exports = router;
