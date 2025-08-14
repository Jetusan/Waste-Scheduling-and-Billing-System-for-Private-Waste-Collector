const { pool } = require('../config/db');

const NotificationModel = {
  async getAll() {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    return result.rows;
  },
  async getByUserEmail(email) {
    const result = await pool.query(`
      SELECT n.* FROM notifications n
      JOIN users u ON n.user_id = u.user_id
      WHERE u.email = $1
      ORDER BY n.created_at DESC
    `, [email]);
    return result.rows;
  },
  async create({ user_id, title, message, channels, priority, scheduled_time }) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at)
       VALUES ($1, $2, $3, false, NOW()) RETURNING *`,
      [user_id, title, message]
    );
    return result.rows[0];
  },
  async updateReadStatus(notification_id, is_read) {
    const result = await pool.query(
      'UPDATE notifications SET is_read = $1 WHERE notification_id = $2 RETURNING *',
      [is_read, notification_id]
    );
    return result.rows[0];
  }
};

module.exports = NotificationModel;