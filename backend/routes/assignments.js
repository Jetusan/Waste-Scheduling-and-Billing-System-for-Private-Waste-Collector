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
// Query: collector_id?, schedule_id?, active_only=true|false, type=schedule|barangay|all
router.get('/', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { collector_id, schedule_id, active_only, type = 'all' } = req.query || {};
    
    let assignments = [];

    // Get schedule-based assignments (legacy)
    if (type === 'schedule' || type === 'all') {
      try {
        const params = [];
        const wheres = [];

        if (collector_id) { params.push(parseInt(collector_id, 10)); wheres.push(`ca.collector_id = $${params.length}`); }
        if (schedule_id) { params.push(parseInt(schedule_id, 10)); wheres.push(`ca.schedule_id = $${params.length}`); }
        if (String(active_only).toLowerCase() === 'true') {
          wheres.push(`(ca.effective_start_date IS NULL OR ca.effective_start_date <= CURRENT_DATE)`);
          wheres.push(`(ca.effective_end_date IS NULL OR ca.effective_end_date >= CURRENT_DATE)`);
        }

        const scheduleQuery = `
          SELECT ca.assignment_id, ca.collector_id, ca.schedule_id,
                 ca.effective_start_date, ca.effective_end_date, ca.shift_label,
                 ca.created_by, ca.created_at, ca.updated_by, ca.updated_at,
                 cs.schedule_date, cs.waste_type, cs.time_range,
                 'schedule' as assignment_type
          FROM collector_assignments ca
          JOIN collection_schedules cs ON cs.schedule_id = ca.schedule_id
          ${wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''}
          ORDER BY ca.created_at DESC
        `;

        const scheduleResult = await pool.query(scheduleQuery, params);
        assignments = assignments.concat(scheduleResult.rows);
      } catch (err) {
        console.log('Schedule assignments table may not exist:', err.message);
      }
    }

    // Get barangay-based assignments (new system)
    if (type === 'barangay' || type === 'all') {
      try {
        const params = [];
        const wheres = [];

        if (collector_id) { params.push(parseInt(collector_id, 10)); wheres.push(`cba.collector_id = $${params.length}`); }
        if (String(active_only).toLowerCase() === 'true') {
          wheres.push(`(cba.effective_start_date IS NULL OR cba.effective_start_date <= CURRENT_DATE)`);
          wheres.push(`(cba.effective_end_date IS NULL OR cba.effective_end_date >= CURRENT_DATE)`);
        }

        const barangayQuery = `
          SELECT cba.assignment_id, cba.collector_id, cba.barangay_id,
                 cba.effective_start_date, cba.effective_end_date, cba.shift_label,
                 cba.created_by, cba.created_at, cba.updated_by, cba.updated_at,
                 b.barangay_name,
                 'barangay' as assignment_type
          FROM collector_barangay_assignments cba
          LEFT JOIN barangays b ON b.barangay_id = cba.barangay_id
          ${wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''}
          ORDER BY cba.created_at DESC
        `;

        const barangayResult = await pool.query(barangayQuery, params);
        assignments = assignments.concat(barangayResult.rows);
      } catch (err) {
        console.log('Barangay assignments table may not exist yet:', err.message);
      }
    }

    // Sort all assignments by creation date
    assignments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error('Error listing assignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to list assignments', details: err.message });
  }
});

// Admin-only: create barangay-based assignment
// Body: { collector_id: int, barangay_id: int, effective_start_date?: 'YYYY-MM-DD', effective_end_date?: 'YYYY-MM-DD', shift_label?: string }
router.post('/barangay', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { collector_id, barangay_id, effective_start_date, effective_end_date, shift_label } = req.body || {};
    if (!collector_id || !barangay_id) {
      return res.status(400).json({ success: false, message: 'collector_id and barangay_id are required' });
    }

    // Check if collector is already assigned to this barangay
    const existingAssignment = await pool.query(
      `SELECT assignment_id FROM collector_barangay_assignments 
       WHERE collector_id = $1 AND barangay_id = $2 
       AND (effective_end_date IS NULL OR effective_end_date >= CURRENT_DATE)`,
      [parseInt(collector_id, 10), parseInt(barangay_id, 10)]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Collector is already assigned to this barangay' 
      });
    }

    // Create the table if it doesn't exist
    await pool.queryWithRetry(`
      CREATE TABLE IF NOT EXISTS collector_barangay_assignments (
        assignment_id SERIAL PRIMARY KEY,
        collector_id INTEGER NOT NULL,
        barangay_id INTEGER NOT NULL,
        effective_start_date DATE,
        effective_end_date DATE,
        shift_label VARCHAR(100),
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const q = `
      INSERT INTO collector_barangay_assignments 
       (collector_id, barangay_id, effective_start_date, effective_end_date, shift_label, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *
    `;

    const createdBy = req.user?.userId || null;
    const result = await pool.queryWithRetry(q, [
      parseInt(collector_id, 10),
      parseInt(barangay_id, 10),
      effective_start_date || null,
      effective_end_date || null,
      shift_label || null,
      createdBy
    ]);

    return res.json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error('Error creating barangay assignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to create barangay assignment', details: err.message });
  }
});

// Admin-only: delete assignment
router.delete('/:assignment_id', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { assignment_id } = req.params;
    
    // Try to delete from both tables (schedule-based and barangay-based)
    const scheduleResult = await pool.query('DELETE FROM collector_assignments WHERE assignment_id = $1', [parseInt(assignment_id, 10)]);
    const barangayResult = await pool.query('DELETE FROM collector_barangay_assignments WHERE assignment_id = $1', [parseInt(assignment_id, 10)]);
    
    if (scheduleResult.rowCount === 0 && barangayResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete assignment', details: err.message });
  }
});

module.exports = router;
