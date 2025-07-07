const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all barangays
router.get('/', async (req, res) => {
    try {
        console.log('Fetching barangays...');
        const result = await pool.query(`
            SELECT * FROM barangays 
            ORDER BY barangay_name ASC
        `);
        console.log('Barangays fetched:', result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in /barangays route:', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
});

// Update barangay name
router.put('/:id', async (req, res) => {
    const { barangay_name } = req.body;
    const { id } = req.params;
    if (!barangay_name) {
        return res.status(400).json({ error: 'Barangay name is required' });
    }
    try {
        const result = await pool.query(
            'UPDATE barangays SET barangay_name = $1 WHERE barangay_id = $2 RETURNING *',
            [barangay_name, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Barangay not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating barangay:', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
});

module.exports = router; 