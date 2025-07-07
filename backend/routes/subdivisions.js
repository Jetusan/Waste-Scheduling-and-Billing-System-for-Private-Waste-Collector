const express = require('express');
const router = express.Router();
const { schedulingPool } = require('../config/db');

// Get all subdivisions with their barangay names
router.get('/', async (req, res) => {
    try {
        const result = await schedulingPool.query(`
            SELECT s.*, b.barangay_name
            FROM subdivisions s
            LEFT JOIN barangays b ON s.barangay_id = b.barangay_id
            ORDER BY s.subdivision_name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 