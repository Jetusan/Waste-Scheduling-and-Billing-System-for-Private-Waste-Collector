// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Layout.css';
import Logo from '../assets/images/LOGO.png';

const navConfig = [
  { title: 'Dashboard', icon: 'fas fa-chart-line', path: '/admin/dashboard' },
  {
    title: 'Operations',
    icon: 'fas fa-cogs',
    key: 'operations',
    items: [
      { title: 'Collection Schedule', icon: 'fas fa-calendar-alt', path: '/admin/operations/schedule' },
      { title: 'Users',          icon: 'fas fa-users',         path: '/admin/operations/subscribers' }
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
  '/admin/dashboard': 'Dashboard',
  '/admin/operations/schedule': 'Collection Schedule',
  '/admin/operations/subscribers': 'Users',
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

  // close avatar when clicking outside
  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('.avatar-container')) setAvatarOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const toggle = key => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  const isActive = path => loc.pathname.startsWith(path);

  const logout = () => {
    sessionStorage.removeItem('adminAuth');
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
            <button className="icon-btn notification">
              <i className="fas fa-bell" /><span className="badge" />
            </button>
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
