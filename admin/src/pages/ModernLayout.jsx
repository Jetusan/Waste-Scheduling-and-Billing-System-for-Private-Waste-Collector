import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/ModernLayoutNew.css';
import Logo from '../assets/images/LOGO.png';
import axios from 'axios';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

const navConfig = [
  { 
    title: 'Home', 
    icon: 'fas fa-home', 
    path: '/admin/home',
    description: 'Overview & Analytics'
  },
  {
    title: 'Operations',
    icon: 'fas fa-cogs',
    key: 'operations',
    description: 'Manage Collections',
    items: [
      { title: 'Collection Schedule', icon: 'fas fa-calendar-alt', path: '/admin/operations/schedule' },
      { title: 'Users & Residents', icon: 'fas fa-users', path: '/admin/operations/subscribers' },
      { title: 'Assignments', icon: 'fas fa-user-check', path: '/admin/operations/assignments' },
      { title: 'Route Issues', icon: 'fas fa-exclamation-triangle', path: '/admin/operations/route-issues' }
    ]
  },
  {
    title: 'Billing',
    icon: 'fas fa-file-invoice-dollar',
    key: 'billing',
    description: 'Financial Management',
    items: [
      { title: 'Invoice Management', icon: 'fas fa-file-invoice', path: '/admin/billing' },
      { title: 'Payment History', icon: 'fas fa-history', path: '/admin/billing-history' }
    ]
  },
  {
    title: 'Reports',
    icon: 'fas fa-chart-line',
    key: 'insights',
    description: 'Analytics & Insights',
    items: [
      { title: 'System Reports', icon: 'fas fa-chart-bar', path: '/admin/insights/reports' }
    ]
  },
  {
    title: 'Settings',
    icon: 'fas fa-cog',
    key: 'settings',
    description: 'System Configuration',
    items: [
      { title: 'Notifications', icon: 'fas fa-bell', path: '/admin/settings/notifications' },
      { title: 'About', icon: 'fas fa-info-circle', path: '/admin/settings/about' }
    ]
  }
];

const pageTitles = {
  '/admin/home': 'Home',
  '/admin/dashboard': 'Home',
  '/admin/operations/schedule': 'Collection Schedule',
  '/admin/operations/subscribers': 'Users & Residents',
  '/admin/operations/assignments': 'Collector Assignments',
  '/admin/operations/route-issues': 'Route Issues',
  '/admin/billing': 'Invoice Management',
  '/admin/billing-history': 'Payment History',
  '/admin/insights/reports': 'System Reports',
  '/admin/settings/notifications': 'Notifications',
  '/admin/settings/about': 'About',
  '/admin/profile': 'Profile Settings'
};

export default function ModernLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({});
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
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
  const isActive = path => location.pathname.startsWith(path);

  const logout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('tempAdmin');
    localStorage.removeItem('adminToken');
    setAvatarOpen(false);
    setNotificationOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="modern-dashboard">
      {/* Modern Sidebar */}
      <aside className={`modern-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">
              <img src={Logo} alt="WSBS Logo" className="logo-image" />
            </div>
            {!sidebarCollapsed && (
              <div className="logo-text">
                <span className="logo-title">WSBS</span>
                <span className="logo-subtitle">Admin Panel</span>
              </div>
            )}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {navConfig.map(item =>
              !item.items ? (
                <Link
                  key={item.title}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  title={sidebarCollapsed ? item.title : ''}
                >
                  <div className="nav-item-content">
                    <div className="nav-icon">
                      <i className={item.icon} />
                    </div>
                    {!sidebarCollapsed && (
                      <div className="nav-text">
                        <span className="nav-title">{item.title}</span>
                        <span className="nav-description">{item.description}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ) : (
                <div key={item.key} className="nav-group">
                  <div
                    className={`nav-item has-children ${openMenus[item.key] ? 'open' : ''}`}
                    onClick={() => !sidebarCollapsed && toggle(item.key)}
                    title={sidebarCollapsed ? item.title : ''}
                  >
                    <div className="nav-item-content">
                      <div className="nav-icon">
                        <i className={item.icon} />
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          <div className="nav-text">
                            <span className="nav-title">{item.title}</span>
                            <span className="nav-description">{item.description}</span>
                          </div>
                          <div className="nav-chevron">
                            <i className="fas fa-chevron-down" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {!sidebarCollapsed && (
                    <div className={`nav-submenu ${openMenus[item.key] ? 'open' : ''}`}>
                      {item.items.map(subitem => (
                        <Link
                          key={subitem.title}
                          to={subitem.path}
                          className={`nav-subitem ${isActive(subitem.path) ? 'active' : ''}`}
                        >
                          <div className="nav-subitem-content">
                            <i className={subitem.icon} />
                            <span>{subitem.title}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <div className="admin-info">
              <div className="admin-avatar">
                <i className="fas fa-user-shield" />
              </div>
              <div className="admin-details">
                <span className="admin-name">Admin User</span>
                <span className="admin-role">System Administrator</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Modern Header */}
        <header className="modern-header">
          <div className="header-left">
            <h1 className="page-title">{pageTitles[location.pathname] || 'Admin Dashboard'}</h1>
            <div className="breadcrumb">
              <span>{pageTitles[location.pathname]?.split(' ')[0] || 'Home'}</span>
            </div>
          </div>
          
          <div className="header-right">
            {/* Header Actions */}
            <div className="header-actions">
              {/* Notifications */}
              <div className="notification-container">
                <button
                  className="action-btn notification-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotificationOpen(!notificationOpen);
                  }}
                >
                  <i className="fas fa-bell" />
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>
                {notificationOpen && (
                  <div className="notification-dropdown">
                    <div className="dropdown-header">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="mark-all-read">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="notification-list">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 8).map(notification => (
                          <div
                            key={notification.notification_id}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                            onClick={() => markAsRead(notification.notification_id)}
                          >
                            <div className="notification-icon">
                              <i className="fas fa-info-circle" />
                            </div>
                            <div className="notification-content">
                              <div className="notification-title">{notification.title}</div>
                              <div className="notification-message">{notification.message}</div>
                              <div className="notification-time">
                                {formatTimeAgo(notification.created_at)}
                              </div>
                            </div>
                            {!notification.is_read && <div className="unread-indicator"></div>}
                          </div>
                        ))
                      ) : (
                        <div className="empty-notifications">
                          <i className="fas fa-bell-slash" />
                          <p>No notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Profile */}
              <div 
                className="admin-profile" 
                onClick={(e) => {
                  e.stopPropagation();
                  setAvatarOpen(!avatarOpen);
                }}
              >
                <div className="profile-avatar">
                  <i className="fas fa-user" />
                </div>
                <div className="profile-info">
                  <span className="profile-name">Admin</span>
                  <span className="profile-role">Administrator</span>
                </div>
                <i className="fas fa-chevron-down profile-chevron" />
              </div>
              {avatarOpen && (
                <div className="profile-dropdown">
                  <Link to="/admin/profile" className="dropdown-item">
                    <i className="fas fa-user" />
                    <span>My Profile</span>
                  </Link>
                  <Link to="/admin/settings/preferences" className="dropdown-item">
                    <i className="fas fa-cog" />
                    <span>Settings</span>
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={logout} className="dropdown-item logout">
                    <i className="fas fa-sign-out-alt" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
