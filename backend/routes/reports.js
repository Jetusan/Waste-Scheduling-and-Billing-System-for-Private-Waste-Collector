const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/reports - fetch all reports (with optional filters and joined related data)
router.get('/', async (req, res) => {
  try {
    const { type, period, status } = req.query;
    let query = `
      SELECT
        r.*,
        u.username,
        u.contact_number,
        n.first_name,
        n.last_name,
        cs.schedule_date,
        cs.schedule_time,
        cs.barangay_id,
        cs.truck_id,
        i.invoice_number,
        i.amount
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN user_names n ON u.name_id = n.name_id
      LEFT JOIN collection_schedules cs ON r.schedule_id = cs.schedule_id
      LEFT JOIN invoices i ON r.invoice_id = i.invoice_id
      WHERE 1=1
    `;
    const params = [];
    if (type) {
      params.push(type);
      query += ` AND r.type = $${params.length}`;
    }
    if (period) {
      params.push(period);
      query += ` AND r.period = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    query += ' ORDER BY r.date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /api/reports - create/generate a new report
router.post('/', async (req, res) => {
  try {
    const { type, period, generated_by, status, schedule, format, recipients, message, start_date, end_date, user_id, schedule_id, invoice_id } = req.body;
    const query = `
      INSERT INTO reports (type, period, generated_by, status, schedule, format, recipients, message, start_date, end_date, user_id, schedule_id, invoice_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [type, period, generated_by, status || 'Pending', schedule, format, recipients, message, start_date, end_date, user_id, schedule_id, invoice_id];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// DELETE /api/reports/:id - delete a report by id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM reports WHERE report_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router; 