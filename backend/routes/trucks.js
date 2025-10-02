const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');

// GET all trucks - return DB data if the trucks table exists; otherwise return sample data
router.get('/', async (req, res) => {
  try {
    console.log('Fetching trucks...');
    
    // Try to fetch all trucks; if the table doesn't exist, fallback to sample data
    try {
      const query = 'SELECT truck_id, truck_number, plate_number, status, created_at FROM trucks ORDER BY created_at DESC';
      const result = await pool.query(query);
      console.log('Found ' + result.rows.length + ' trucks from database');
      return res.json(result.rows);
    } catch (tableError) {
      console.log('Trucks table not found or query failed, returning sample data');
      const sampleTrucks = [
        { truck_id: 1, truck_number: 'TRUCK-001', plate_number: 'ABC-1234', status: 'active', created_at: new Date() },
        { truck_id: 2, truck_number: 'TRUCK-002', plate_number: 'DEF-5678', status: 'active', created_at: new Date() },
        { truck_id: 3, truck_number: 'TRUCK-003', plate_number: 'GHI-9012', status: 'maintenance', created_at: new Date() }
      ];
      return res.json(sampleTrucks);
    }
  } catch (error) {
    console.error('Error fetching trucks:', error);
    res.status(500).json({ error: 'Failed to fetch trucks', details: error.message });
  }
});

// POST - Add new truck
router.post('/', async (req, res) => {
  try {
    const { truck_number, plate_number, status } = req.body;
    console.log('Adding new truck:', { truck_number, plate_number, status });
    
    // Validate required fields
    if (!truck_number || !plate_number) {
      return res.status(400).json({ error: 'Truck number and plate number are required' });
    }
    
    const query = `
      INSERT INTO trucks (truck_number, plate_number, status, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING truck_id, truck_number, plate_number, status, created_at
    `;
    
    const result = await pool.query(query, [
      truck_number,
      plate_number,
      status || 'active'
    ]);
    
    console.log('Truck added successfully:', result.rows[0]);
    res.status(201).json({ 
      success: true, 
      message: 'Truck added successfully',
      truck: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding truck:', error);
    res.status(500).json({ error: 'Failed to add truck', details: error.message });
  }
});

// UPDATE a truck by ID
router.put('/:truck_id', async (req, res) => {
  try {
    const { truck_id } = req.params;
    const { truck_number, plate_number, status } = req.body;
    console.log('Updating truck ' + truck_id, { truck_number, plate_number, status });
    
    const query = `
      UPDATE trucks 
      SET truck_number = $1, plate_number = $2, status = $3, updated_at = NOW()
      WHERE truck_id = $4
      RETURNING truck_id, truck_number, plate_number, status, created_at
    `;
    
    const result = await pool.query(query, [truck_number, plate_number, status, truck_id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    
    console.log('Truck updated successfully:', result.rows[0]);
    res.json({ success: true, message: 'Truck updated successfully', truck: result.rows[0] });
  } catch (error) {
    console.error('Error updating truck:', error);
    res.status(500).json({ error: 'Failed to update truck', details: error.message });
  }
});

// DELETE a truck by ID
router.delete('/:truck_id', async (req, res) => {
  try {
    const { truck_id } = req.params;
    console.log('Deleting truck ' + truck_id);
    
    const query = 'DELETE FROM trucks WHERE truck_id = $1 RETURNING truck_id';
    const result = await pool.query(query, [truck_id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    
    console.log('Truck deleted successfully');
    res.json({ success: true, message: 'Truck deleted successfully' });
  } catch (error) {
    console.error('Error deleting truck:', error);
    res.status(500).json({ error: 'Failed to delete truck', details: error.message });
  }
});

module.exports = router;
