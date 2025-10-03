import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Notifications.css';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

const Notifications = () => {
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    recipient: 'Collector',
    email: '', // Add email field
    message: '',
    scheduleTime: '',
    channels: {
      push: true,
      email: false,
      sms: false
    },
    priority: 'normal'
  });

  // Remove hardcoded notifications, use empty array initially
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications from backend on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    axios.get(`${API_BASE_URL}/notifications`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        // Backend shape: { success: true, notifications: [{ notification_id, title, message, is_read, created_at }] }
        const rows = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
        // Map to UI shape expected by the table
        const mapped = rows.map(r => ({
          id: r.notification_id,
          recipient: r.title || 'Admin',
          message: r.message,
          channels: [], // No channel info from backend
          priority: 'normal', // Default priority
          status: 'Sent', // Treat fetched notifications as sent
          readStatus: r.is_read ? 'Read' : 'Unread',
          timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : ''
        }));
        setNotifications(mapped);
      })
      .catch(err => {
        console.error('Failed to fetch notifications:', err);
      });
  }, []);

  // Sample user notification history
  const [userHistory] = useState({
    'john.doe@example.com': [
      { timestamp: '2024-01-20 09:30', message: 'Route changes for Downtown area', readStatus: 'Read' },
      { timestamp: '2024-01-19 14:20', message: 'Schedule updated for next week', readStatus: 'Read' },
      { timestamp: '2024-01-18 11:15', message: 'New safety guidelines published', readStatus: 'Unread' }
    ],
    'jane.smith@example.com': [
      { timestamp: '2024-01-20 10:15', message: 'Maintenance scheduled tonight', readStatus: 'Unread' },
      { timestamp: '2024-01-19 16:45', message: 'Holiday schedule reminder', readStatus: 'Read' }
    ]
  });

  const handleChange = e => {
    const { name, value } = e.target;
    if (name.startsWith('channel-')) {
      const channel = name.replace('channel-', '');
      setForm(prev => ({
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: !prev.channels[channel]
        }
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      // Send to backend
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      await axios.post(`${API_BASE_URL}/notifications`, {
          email: form.email,
          title: form.recipient, // Using recipient as title for now, adjust as needed
          message: form.message
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // Refetch notifications
      const res = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const rows = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
      const mapped = rows.map(r => ({
        id: r.notification_id,
        recipient: r.title || 'Admin',
        message: r.message,
        channels: [],
        priority: 'normal',
        status: 'Sent',
        readStatus: r.is_read ? 'Read' : 'Unread',
        timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : ''
      }));
      setNotifications(mapped);
      setShowModal(false);
      setForm({
        recipient: 'Collector',
        email: '',
        message: '',
        scheduleTime: '',
        channels: { push: true, email: false, sms: false },
        priority: 'normal'
      });
    } catch (err) {
      alert('Failed to send notification: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleReadStatus = async (id) => {
    // Only support marking unread -> read, as per backend route semantics
    const target = notifications.find(n => n.id === id);
    if (!target || target.readStatus === 'Read') return;
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      await axios.put(`${API_BASE_URL}/notifications/${id}/read`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setNotifications(prev => prev.map(n => (
        n.id === id ? { ...n, readStatus: 'Read' } : n
      )));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      alert('Failed to mark as read.');
    }
  };

  const getChannelIcon = (channel) => {
    switch(channel) {
      case 'push': return 'fas fa-bell';
      case 'email': return 'fas fa-envelope';
      case 'sms': return 'fas fa-sms';
      default: return 'fas fa-bell';
    }
  };

  return (
    <>
      <section className="notifications-content">
        {/* Stats Cards */}
        <div className="notification-stats">
          <div className="stat-card">
            <i className="fas fa-paper-plane"></i>
            <div>
              <h4>Total Sent</h4>
              <p>{notifications.filter(n => n.status === 'Sent').length}</p>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-clock"></i>
            <div>
              <h4>Scheduled</h4>
              <p>{notifications.filter(n => n.status === 'Scheduled').length}</p>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-envelope-open"></i>
            <div>
              <h4>Unread</h4>
              <p>{notifications.filter(n => n.readStatus === 'Unread').length}</p>
            </div>
          </div>
        </div>

        <div className="notifications-header">
          <div className="search-filters">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search notifications..." />
            </div>
            <div className="filters">
              <select>
                <option>All Recipients</option>
                <option>Collector</option>
                <option>User</option>
              </select>
              <select>
                <option>All Status</option>
                <option>Sent</option>
                <option>Pending</option>
                <option>Scheduled</option>
              </select>
              <select>
                <option>All Priority</option>
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="view-history-btn"
              onClick={() => setShowHistoryModal(true)}
            >
              <i className="fas fa-history"></i> View History
            </button>
            <button 
              className="send-notification" 
              onClick={() => setShowModal(true)}
            >
              <i className="fas fa-plus"></i> New Notification
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="notifications-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Recipient</th>
                <th>Message</th>
                <th>Channels</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Read</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id} className={n.readStatus === 'Unread' ? 'unread-row' : ''}>
                  <td>{n.id}</td>
                  <td>{n.recipient}</td>
                  <td className="message-cell">{n.message}</td>
                  <td>
                    <div className="channel-icons">
                      {n.channels.map(channel => (
                        <i 
                          key={channel} 
                          className={getChannelIcon(channel)}
                          title={channel.charAt(0).toUpperCase() + channel.slice(1)}
                        ></i>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`priority-badge ${n.priority}`}>
                      {n.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${n.status.toLowerCase()}`}>
                      {n.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className={`read-status-btn ${n.readStatus.toLowerCase()}`}
                      onClick={() => toggleReadStatus(n.id)}
                    >
                      <i className={`fas fa-${n.readStatus === 'Read' ? 'check-circle' : 'circle'}`}></i>
                      {n.readStatus}
                    </button>
                  </td>
                  <td>{n.timestamp}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn" title="View Details">
                        <i className="fas fa-eye"></i>
                      </button>
                      <button className="action-btn" title="Resend">
                        <i className="fas fa-redo"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Notification Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3><i className="fas fa-bell"></i> New Notification</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="notification-form">
              <div className="form-group">
                <label>Recipient Type</label>
                <select name="recipient" value={form.recipient} onChange={handleChange}>
                  <option>Collector</option>
                  <option>User</option>
                </select>
              </div>

              <div className="form-group">
                <label>User Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Type your notification..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notification Channels</label>
                <div className="channel-options">
                  <label className="channel-option">
                    <input
                      type="checkbox"
                      name="channel-push"
                      checked={form.channels.push}
                      onChange={handleChange}
                    />
                    <i className="fas fa-bell"></i> Push
                  </label>
                  <label className="channel-option">
                    <input
                      type="checkbox"
                      name="channel-email"
                      checked={form.channels.email}
                      onChange={handleChange}
                    />
                    <i className="fas fa-envelope"></i> Email
                  </label>
                  <label className="channel-option">
                    <input
                      type="checkbox"
                      name="channel-sms"
                      checked={form.channels.sms}
                      onChange={handleChange}
                    />
                    <i className="fas fa-sms"></i> SMS
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Schedule Time (Optional)</label>
                <input
                  type="datetime-local"
                  name="scheduleTime"
                  value={form.scheduleTime}
                  onChange={handleChange}
                />
              </div>

              <div className="form-buttons">
                <button type="button" onClick={() => setShowModal(false)} className="cancel">
                  Cancel
                </button>
                <button type="submit" className="send">
                  <i className="fas fa-paper-plane"></i> Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal history-modal">
            <div className="modal-header">
              <h3><i className="fas fa-history"></i> Notification History</h3>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="history-content">
              <div className="user-select">
                <select 
                  value={selectedUser || ''} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Select User</option>
                  {Object.keys(userHistory).map(email => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="history-list">
                  {userHistory[selectedUser].map((notification, index) => (
                    <div key={index} className="history-item">
                      <div className="history-item-header">
                        <span className="timestamp">{notification.timestamp}</span>
                        <span className={`read-status ${notification.readStatus.toLowerCase()}`}>
                          <i className={`fas fa-${notification.readStatus === 'Read' ? 'check-circle' : 'circle'}`}></i>
                          {notification.readStatus}
                        </span>
                      </div>
                      <p className="message">{notification.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Notifications;
