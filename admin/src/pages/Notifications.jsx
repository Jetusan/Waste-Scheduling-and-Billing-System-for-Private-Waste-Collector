import React from 'react';
import '../styles/Notifications.css';

const Notifications = () => {
  const notifications = [
    { id: 'NOT-001', recipient: 'Collector', message: 'Schedule update: Route changes for downtown area', status: 'Sent', timestamp: '2024-01-20 | 09:30' },
    { id: 'NOT-002', recipient: 'User', message: 'System maintenance scheduled for tonight', status: 'Pending', timestamp: '2024-01-20 | 10:15' },
    { id: 'NOT-003', recipient: 'Collector', message: 'New collection guidelines updated', status: 'Sent', timestamp: '2024-01-20 | 11:00' }
  ];

  return (
        <section className="notifications-content">
          <div className="notifications-header">
            <input type="text" placeholder="Search notifications..." />
            <button className="send-notification">+ Send Notification</button>
          </div>
          
          <table className="notifications-table">
            <thead>
              <tr>
                <th>Notification ID</th>
                <th>Recipient Type</th>
                <th>Message Preview</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td>{notification.id}</td>
                  <td>{notification.recipient}</td>
                  <td>{notification.message}</td>
                  <td>
                    <span className={`status-badge ${notification.status.toLowerCase()}`}>
                      {notification.status}
                    </span>
                  </td>
                  <td>{notification.timestamp}</td>
                  <td>
                    <button className="action-btn view">View</button>
                    <button className="action-btn resend">Resend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
  );
};

export default Notifications;