const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all trucks
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM trucks 
            WHERE status = 'active'
            ORDER BY truck_number ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching trucks:', err);
        res.status(500).json({ error: 'Failed to fetch trucks' });
    }
});

module.exports = router; 