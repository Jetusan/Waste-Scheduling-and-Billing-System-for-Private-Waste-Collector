const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all schedules with barangay and truck details
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                cs.schedule_id,
                cs.schedule_date,
                cs.schedule_time,
                cs.created_at,
                b.barangay_name,
                t.truck_number,
                t.driver_name
            FROM collection_schedules cs
            JOIN barangays b ON cs.barangay_id = b.barangay_id
            JOIN trucks t ON cs.truck_id = t.truck_id
            ORDER BY cs.schedule_date DESC, cs.schedule_time ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching schedules:', err);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

// POST new schedule
router.post('/', async (req, res) => {
    const { barangay_id, truck_id, schedule_date, schedule_time } = req.body;
    
    // Validate required fields
    if (!barangay_id || !truck_id || !schedule_date || !schedule_time) {
        console.error('Missing required fields:', { barangay_id, truck_id, schedule_date, schedule_time });
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // First verify the barangay exists
        const barangayCheck = await pool.query(
            'SELECT barangay_id FROM barangays WHERE barangay_id = $1',
            [barangay_id]
        );
        
        if (barangayCheck.rows.length === 0) {
            console.error('Invalid barangay_id:', barangay_id);
            return res.status(400).json({ error: 'Invalid barangay ID' });
        }

        // Then verify the truck exists
        const truckCheck = await pool.query(
            'SELECT truck_id FROM trucks WHERE truck_id = $1',
            [truck_id]
        );
        
        if (truckCheck.rows.length === 0) {
            console.error('Invalid truck_id:', truck_id);
            return res.status(400).json({ error: 'Invalid truck ID' });
        }

        const query = `
            INSERT INTO collection_schedules 
            (barangay_id, truck_id, schedule_date, schedule_time, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
        `;
        const values = [barangay_id, truck_id, schedule_date, schedule_time];
        
        console.log('Attempting to insert schedule with values:', values);
        const result = await pool.query(query, values);
        console.log('Schedule created successfully:', result.rows[0]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating schedule:', {
            error: err.message,
            stack: err.stack,
            details: err.detail,
            code: err.code,
            constraint: err.constraint
        });
        res.status(500).json({ error: 'Failed to create schedule', details: err.message });
    }
});

// DELETE schedule
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM collection_schedules WHERE schedule_id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json({ message: 'Schedule deleted successfully' });
    } catch (err) {
        console.error('Error deleting schedule:', err);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

// Update schedule
router.put('/:id', async (req, res) => {
    const { barangay_id, truck_id, schedule_date, schedule_time } = req.body;
    const { id } = req.params;

    console.log('Update schedule request:', {
        schedule_id: id,
        barangay_id,
        truck_id,
        schedule_date,
        schedule_time
    });

    // Validate required fields
    if (!barangay_id || !truck_id || !schedule_date || !schedule_time) {
        console.error('Missing required fields:', { barangay_id, truck_id, schedule_date, schedule_time });
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // First verify the barangay exists
        const barangayCheck = await pool.query(
            'SELECT barangay_id FROM barangays WHERE barangay_id = $1',
            [barangay_id]
        );
        console.log('Barangay check result:', barangayCheck.rows);
        
        if (barangayCheck.rows.length === 0) {
            console.error('Invalid barangay_id:', barangay_id);
            return res.status(400).json({ error: 'Invalid barangay ID' });
        }

        // Then verify the truck exists
        const truckCheck = await pool.query(
            'SELECT truck_id FROM trucks WHERE truck_id = $1',
            [truck_id]
        );
        console.log('Truck check result:', truckCheck.rows);
        
        if (truckCheck.rows.length === 0) {
            console.error('Invalid truck_id:', truck_id);
            return res.status(400).json({ error: 'Invalid truck ID' });
        }

        // Update the schedule
        const query = `
            UPDATE collection_schedules 
            SET barangay_id = $1, 
                truck_id = $2, 
                schedule_date = $3, 
                schedule_time = $4,
                created_at = created_at
            WHERE schedule_id = $5
            RETURNING *
        `;
        const values = [barangay_id, truck_id, schedule_date, schedule_time, id];
        console.log('Executing update query with values:', values);
        
        const result = await pool.query(query, values);
        console.log('Update result:', result.rows);
        
        if (result.rows.length === 0) {
            console.error('Schedule not found with ID:', id);
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Fetch the updated schedule with related data
        const updatedSchedule = await pool.query(`
            SELECT 
                cs.schedule_id,
                cs.schedule_date,
                cs.schedule_time,
                cs.created_at,
                b.barangay_name,
                b.barangay_id,
                t.truck_number,
                t.truck_id,
                t.driver_name
            FROM collection_schedules cs
            JOIN barangays b ON cs.barangay_id = b.barangay_id
            JOIN trucks t ON cs.truck_id = t.truck_id
            WHERE cs.schedule_id = $1
        `, [id]);

        res.json(updatedSchedule.rows[0]);
    } catch (err) {
        console.error('Error updating schedule:', {
            error: err.message,
            stack: err.stack,
            details: err.detail,
            code: err.code
        });
        res.status(500).json({ 
            error: 'Failed to update schedule', 
            details: err.message,
            code: err.code 
        });
    }
});

module.exports = router; 