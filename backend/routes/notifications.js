const express = require('express');
const router = express.Router();
const pool = require('../config/dbAdmin');
const { authenticateJWT } = require('../middleware/auth');

// Server-side admin check using DB role lookup
async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const result = await pool.query(
      `SELECT r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [userId]
    );
    const roleName = result.rows[0]?.role_name;
    if (roleName !== 'admin') return res.status(403).json({ message: 'Forbidden: admin only' });
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Get all notifications for the authenticated admin
router.get('/', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = `
      SELECT notification_id, title, message, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [userId]);
    res.json({ success: true, notifications: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const query = `
      UPDATE notifications 
      SET is_read = true 
      WHERE notification_id = $1 AND user_id = $2
      RETURNING notification_id
    `;
    const result = await pool.query(query, [id, userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// Get unread notification count
router.get('/unread-count', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    const result = await pool.query(query, [userId]);
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

// ===== Resident (any role) endpoints =====
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const q = `
      SELECT notification_id, title, message, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const r = await pool.query(q, [userId]);
    return res.json({ success: true, notifications: r.rows });
  } catch (e) {
    console.error('Error fetching user notifications:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

router.get('/me/unread-count', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const q = `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`;
    const r = await pool.query(q, [userId]);
    return res.json({ success: true, count: r.rows[0]?.count || 0 });
  } catch (e) {
    console.error('Error fetching user unread count:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

router.put('/me/:id/read', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id`,
      [id, userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('Error marking user notification read:', e);
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

module.exports = router;