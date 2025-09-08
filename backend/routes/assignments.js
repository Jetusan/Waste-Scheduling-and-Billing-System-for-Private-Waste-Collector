const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Admin-only: create an assignment
// Body: { collector_id: int, schedule_id: int, effective_start_date?: 'YYYY-MM-DD', effective_end_date?: 'YYYY-MM-DD', shift_label?: string }
router.post('/', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { collector_id, schedule_id, effective_start_date, effective_end_date, shift_label } = req.body || {};
    if (!collector_id || !schedule_id) {
      return res.status(400).json({ success: false, message: 'collector_id and schedule_id are required' });
    }

    const q = `
      INSERT INTO collector_assignments (
        collector_id, schedule_id, effective_start_date, effective_end_date, shift_label, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING assignment_id, collector_id, schedule_id, effective_start_date, effective_end_date, shift_label, created_at
    `;

    const createdBy = req.user?.userId || null;
    const result = await pool.query(q, [
      parseInt(collector_id, 10),
      parseInt(schedule_id, 10),
      effective_start_date || null,
      effective_end_date || null,
      shift_label || null,
      createdBy
    ]);

    return res.json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error('Error creating assignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to create assignment', details: err.message });
  }
});

// Admin-only: list assignments (with optional filters)
// Query: collector_id?, schedule_id?, active_only=true|false
router.get('/', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { collector_id, schedule_id, active_only } = req.query || {};
    const params = [];
    const wheres = [];

    if (collector_id) { params.push(parseInt(collector_id, 10)); wheres.push(`ca.collector_id = $${params.length}`); }
    if (schedule_id) { params.push(parseInt(schedule_id, 10)); wheres.push(`ca.schedule_id = $${params.length}`); }
    if (String(active_only).toLowerCase() === 'true') {
      wheres.push(`(ca.effective_start_date IS NULL OR ca.effective_start_date <= CURRENT_DATE)`);
      wheres.push(`(ca.effective_end_date IS NULL OR ca.effective_end_date >= CURRENT_DATE)`);
    }

    const q = `
      SELECT ca.assignment_id, ca.collector_id, ca.schedule_id,
             ca.effective_start_date, ca.effective_end_date, ca.shift_label,
             ca.created_by, ca.created_at, ca.updated_by, ca.updated_at,
             cs.schedule_date, cs.waste_type, cs.time_range
      FROM collector_assignments ca
      JOIN collection_schedules cs ON cs.schedule_id = ca.schedule_id
      ${wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''}
      ORDER BY ca.created_at DESC
    `;

    const result = await pool.query(q, params);
    return res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Error listing assignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to list assignments', details: err.message });
  }
});

// Admin-only: delete assignment
router.delete('/:assignment_id', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const result = await pool.query('DELETE FROM collector_assignments WHERE assignment_id = $1', [parseInt(assignment_id, 10)]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete assignment', details: err.message });
  }
});

module.exports = router;
