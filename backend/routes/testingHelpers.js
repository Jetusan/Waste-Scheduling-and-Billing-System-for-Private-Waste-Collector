const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateJWT } = require('../middleware/auth');

// Clear duplicate image records for testing
// POST /api/testing/clear-duplicates
router.post('/clear-duplicates', authenticateJWT, async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.user?.userId;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Clear all manual payment verifications for the user
    const result = await pool.query(
      'DELETE FROM manual_payment_verifications WHERE user_id = $1 RETURNING *',
      [user_id]
    );

    console.log(`🗑️ Cleared ${result.rows.length} duplicate records for user ${user_id}`);

    return res.json({
      success: true,
      message: `Cleared ${result.rows.length} records`,
      cleared_records: result.rows.length,
      user_id: user_id
    });

  } catch (error) {
    console.error('Error clearing duplicates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear duplicate records',
      error: error.message
    });
  }
});

// Clear specific verification by ID
// DELETE /api/testing/clear-verification/:id
router.delete('/clear-verification/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.user_id || req.user?.userId;

    const result = await pool.query(
      'DELETE FROM manual_payment_verifications WHERE verification_id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification record not found or not owned by user'
      });
    }

    console.log(`🗑️ Cleared verification ${id} for user ${user_id}`);

    return res.json({
      success: true,
      message: `Cleared verification ${id}`,
      cleared_record: result.rows[0]
    });

  } catch (error) {
    console.error('Error clearing verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear verification record',
      error: error.message
    });
  }
});

// Get all verifications for user (for debugging)
// GET /api/testing/my-verifications
router.get('/my-verifications', authenticateJWT, async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.user?.userId;

    const result = await pool.query(
      'SELECT * FROM manual_payment_verifications WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );

    return res.json({
      success: true,
      verifications: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching verifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verifications',
      error: error.message
    });
  }
});

module.exports = router;
