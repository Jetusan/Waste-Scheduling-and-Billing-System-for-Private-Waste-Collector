const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all residents with user details
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
            WHERE u.role_id = 3
            ORDER BY u.created_at DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching residents:', err);
        res.status(500).json({ error: 'Failed to fetch residents' });
    }
});

// Update a resident
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { 
            first_name, 
            last_name, 
            contact_number, 
            street_address, 
            barangay, 
            city, 
            subscription_status 
        } = req.body;
        const { id } = req.params;

        console.log('Updating resident:', {
            id,
            first_name,
            last_name,
            contact_number,
            street_address,
            barangay,
            city,
            subscription_status
        });

        await client.query('BEGIN');

        // Update residents table
        const updateResidentQuery = `
            UPDATE residents 
            SET 
                first_name = $1,
                last_name = $2,
                street_address = $3,
                barangay = $4,
                city = $5,
                subscription_status = $6
            WHERE resident_id = $7
            RETURNING user_id
        `;
        const residentResult = await client.query(updateResidentQuery, [
            first_name,
            last_name,
            street_address,
            barangay,
            city,
            subscription_status,
            id
        ]);

        if (residentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Resident not found' });
        }

        // Update users table
        const updateUserQuery = `
            UPDATE users 
            SET contact_number = $1
            WHERE user_id = $2
            RETURNING *
        `;
        await client.query(updateUserQuery, [contact_number, residentResult.rows[0].user_id]);

        await client.query('COMMIT');

        // Fetch updated resident data
        const updatedResident = await client.query(`
            SELECT 
                r.resident_id,
                r.user_id,
                r.street_address,
                r.subscription_status,
                r.created_at,
                u.username,
                u.contact_number,
                u.created_at,
                u.updated_at,
                r.first_name,
                r.middle_name,
                r.last_name,
                r.barangay,
                r.city
            FROM residents r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.resident_id = $1
        `, [id]);

        res.json(updatedResident.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating resident:', err);
        res.status(500).json({ error: 'Failed to update resident', details: err.message });
    } finally {
        client.release();
    }
});

// Delete a resident
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // First delete from residents table
        const deleteResidentResult = await client.query(
            'DELETE FROM residents WHERE resident_id = $1 RETURNING user_id',
            [req.params.id]
        );
        
        if (deleteResidentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Resident not found' });
        }
        
        // Then delete from users table
        await client.query(
            'DELETE FROM users WHERE user_id = $1',
            [deleteResidentResult.rows[0].user_id]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Resident deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting resident:', err);
        res.status(500).json({ error: 'Failed to delete resident' });
    } finally {
        client.release();
    }
});

module.exports = router; 