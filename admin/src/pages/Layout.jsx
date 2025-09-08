// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Layout.css';
import Logo from '../assets/images/LOGO.png';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const navConfig = [
  { title: 'Dashboard', icon: 'fas fa-chart-line', path: '/admin/dashboard' },
  {
    title: 'Operations',
    icon: 'fas fa-cogs',
    key: 'operations',
    items: [
      { title: 'Collection Schedule', icon: 'fas fa-calendar-alt', path: '/admin/operations/schedule' },
      { title: 'Users',          icon: 'fas fa-users',         path: '/admin/operations/subscribers' },
      { title: 'Assignments',    icon: 'fas fa-user-check',    path: '/admin/operations/assignments' }
    ]
  },
  {
    title: 'Billing',
    icon: 'fas fa-file-invoice-dollar',
    key: 'billing',
    items: [
      { title: 'Management', icon: 'fas fa-file-invoice', path: '/admin/billing' },
      { title: 'History',    icon: 'fas fa-history',      path: '/admin/billing-history' }
    ]
  },
  {
    title: 'Insights',
    icon: 'fas fa-chart-pie',
    key: 'insights',
    items: [
      { title: 'Reports', icon: 'fas fa-chart-bar', path: '/admin/insights/reports' }
    ]
  },
  {
    title: 'Settings',
    icon: 'fas fa-cog',
    key: 'settings',
    items: [
      { title: 'Notifications', icon: 'fas fa-bell',      path: '/admin/settings/notifications' },
      { title: 'Preferences',   icon: 'fas fa-sliders-h', path: '/admin/settings/preferences' }
    ]
  }
];

const pageTitles = {
  '/admin/dashboard': 'Waste Scheduling and Billing System',
  '/admin/operations/schedule': 'Collection Schedule',
  '/admin/operations/subscribers': 'Users',
  '/admin/operations/assignments': 'Collector Assignments',
  '/admin/billing': 'Billing Management',
  '/admin/billing-history': 'Billing History',
  '/admin/insights/reports': 'Reports',
  '/admin/settings/notifications': 'Notifications',
  '/admin/settings/preferences': 'Preferences',
  '/admin/profile': 'Profile'
};

export default function Layout() {
  const loc = useLocation();
  const nav = useNavigate();
  const [openMenus, setOpenMenus] = useState({});
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // close avatar when clicking outside
  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('.avatar-container')) setAvatarOpen(false);
      if (!e.target.closest('.notification-container')) setNotificationOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle the nested response structure from backend
      const notificationData = response.data.notifications || response.data;
      setNotifications(notificationData);
      setUnreadCount(notificationData.filter(notification => !notification.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prevNotifications => prevNotifications.map(notification => {
        if (notification.notification_id === notificationId) {
          return { ...notification, is_read: true };
        }
        return notification;
      }));
      setUnreadCount(prevUnreadCount => Math.max(0, prevUnreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map(notification =>
          axios.put(`${API_BASE_URL}/notifications/${notification.notification_id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const toggle = key => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  const isActive = path => loc.pathname.startsWith(path);

  const logout = () => {
    sessionStorage.removeItem('adminToken');
    nav('/login');
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <img src={Logo} alt="Logo" />
        </div>
        <nav className="nav">
          {navConfig.map(item =>
            !item.items ? (
              <Link
                key={item.title}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <i className={item.icon} />
                <span>{item.title}</span>
              </Link>
            ) : (
              <React.Fragment key={item.key}>
                <div
                  className={`nav-link has-children ${openMenus[item.key] ? 'open' : ''} ${
                    isActive(item.path) ? 'active' : ''
                  }`}
                  onClick={() => toggle(item.key)}
                >
                  <i className={item.icon} />
                  <span>{item.title}</span>
                  <i className="fas fa-chevron-right chevron" />
                </div>
                <div className={`submenu ${openMenus[item.key] ? 'open' : ''}`}>
                  {item.items.map(sub => (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      className={`nav-sublink ${isActive(sub.path) ? 'active' : ''}`}
                    >
                      <i className={sub.icon} />
                      <span>{sub.title}</span>
                    </Link>
                  ))}
                </div>
              </React.Fragment>
            )
          )}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{pageTitles[loc.pathname] || ''}</h1>
          <div className="controls">
            <div className="notification-container">
              <button
                className="icon-btn notification"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificationOpen(o => !o);
                }}
              >
                <i className="fas fa-bell" />
                {unreadCount > 0 && (
                  <span className="badge">{unreadCount}</span>
                )}
              </button>
              {notificationOpen && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="mark-all-read" onClick={markAllAsRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">
                        <i className="fas fa-bell-slash"></i>
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.notification_id}
                          className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                          onClick={() => markAsRead(notification.notification_id)}
                        >
                          <div className="notification-content">
                            <h5>{notification.title || 'Notification'}</h5>
                            <p>{notification.message}</p>
                            <span className="notification-time">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          {!notification.is_read && <div className="notification-indicator"></div>}
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="notification-footer">
                      <Link to="/admin/settings/notifications" onClick={() => setNotificationOpen(false)}>
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="avatar-container">
              <div
                className="avatar"
                onClick={e => { e.stopPropagation(); setAvatarOpen(o => !o); }}
              >
                <i className="fas fa-user" />
              </div>
              {avatarOpen && (
                <ul className="avatar-menu">
                  <li>
                    <Link to="/admin/profile">
                      <i className="fas fa-user-circle" /><span>Profile</span>
                    </Link>
                  </li>
                  <li>
                    <button onClick={logout}>
                      <i className="fas fa-sign-out-alt" /><span>Logout</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
