const NotificationModel = require('../models/notificationModel');
const UserModel = require('../models/userModel');

const notificationController = {
  async getAll(req, res) {
    try {
      const notifications = await NotificationModel.getAll();
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
    }
  },
  async getByUser(req, res) {
    try {
      const { user } = req.query;
      if (!user) return res.status(400).json({ error: 'User email required' });
      const notifications = await NotificationModel.getByUserEmail(user);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user notifications', details: err.message });
    }
  },
  async create(req, res) {
    try {
      const { email, title, message } = req.body;
      if (!email || !title || !message) return res.status(400).json({ error: 'Missing required fields' });
      // Find user_id by email
      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const notification = await NotificationModel.create({ user_id: user.user_id, title, message });
      res.status(201).json(notification);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create notification', details: err.message });
    }
  },
  async updateReadStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_read } = req.body;
      if (typeof is_read !== 'boolean') return res.status(400).json({ error: 'is_read must be boolean' });
      const notification = await NotificationModel.updateReadStatus(id, is_read);
      res.json(notification);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update read status', details: err.message });
    }
  }
};

module.exports = notificationController;