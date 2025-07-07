const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all collectors with user and truck details
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT
              u.user_id,
              u.username,
              u.contact_number,
              n.first_name,
              n.middle_name,
              n.last_name,
              a.street,
              b.barangay_name,
              c.city_name,
              u.created_at
            FROM users u
            JOIN user_names n ON u.name_id = n.name_id
            JOIN addresses a ON u.address_id = a.address_id
            JOIN barangays b ON a.barangay_id = b.barangay_id
            JOIN cities c ON a.city_id = c.city_id
            WHERE u.role_id = 2
            ORDER BY u.created_at DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching collectors:', err);
        res.status(500).json({ error: 'Failed to fetch collectors' });
    }
});

// Update a collector
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { 
            username,
            contact_number,
            truck_number,
            license_number,
            status
        } = req.body;
        const { id } = req.params;

        console.log('Updating collector:', {
            id,
            username,
            contact_number,
            truck_number,
            license_number,
            status
        });

        await client.query('BEGIN');

        // First, get the truck_id from truck_number
        let truckId = null;
        if (truck_number && truck_number !== 'No truck assigned') {
            const truckResult = await client.query(
                'SELECT truck_id FROM trucks WHERE truck_number = $1',
                [truck_number]
            );
            if (truckResult.rows.length > 0) {
                truckId = truckResult.rows[0].truck_id;
            }
        }

        // Update collectors table
        const updateCollectorQuery = `
            UPDATE collectors 
            SET 
                license_number = $1,
                status = $2,
                truck_id = $3
            WHERE collector_id = $4
            RETURNING user_id
        `;
        const collectorResult = await client.query(updateCollectorQuery, [
            license_number,
            status,
            truckId,
            id
        ]);

        if (collectorResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Collector not found' });
        }

        // Update users table
        const updateUserQuery = `
            UPDATE users 
            SET 
                username = $1,
                contact_number = $2
            WHERE user_id = $3
            RETURNING *
        `;
        await client.query(updateUserQuery, [
            username,
            contact_number,
            collectorResult.rows[0].user_id
        ]);

        await client.query('COMMIT');

        // Fetch updated collector data
        const updatedCollector = await client.query(`
            SELECT 
                c.collector_id,
                c.user_id,
                c.license_number,
                c.status,
                c.created_at,
                u.username,
                u.contact_number,
                u.created_at,
                u.updated_at,
                t.truck_number
            FROM collectors c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN trucks t ON c.truck_id = t.truck_id
            WHERE c.collector_id = $1
        `, [id]);

        res.json(updatedCollector.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating collector:', err);
        res.status(500).json({ error: 'Failed to update collector', details: err.message });
    } finally {
        client.release();
    }
});

// Delete a collector
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // First delete from collectors table
        const deleteCollectorResult = await client.query(
            'DELETE FROM collectors WHERE collector_id = $1 RETURNING user_id',
            [req.params.id]
        );
        
        if (deleteCollectorResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Collector not found' });
        }
        
        // Then delete from users table
        await client.query(
            'DELETE FROM users WHERE user_id = $1',
            [deleteCollectorResult.rows[0].user_id]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Collector deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting collector:', err);
        res.status(500).json({ error: 'Failed to delete collector' });
    } finally {
        client.release();
    }
});

module.exports = router; 