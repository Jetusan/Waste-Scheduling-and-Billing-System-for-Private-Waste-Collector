import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import '../styles/MDashboard.css';
import Logo from '../assets/images/LOGO.png'; // Assuming you have a logo image

const Layout = () => {
  const location = useLocation();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo"
          src={Logo}>
        </div>
        <nav className="nav-menu">
          <Link to="/dashboard" className={location.pathname === "/dashboard" ? "active" : ""}>Dashboard</Link>
          <Link to="/collectionschedule" className={location.pathname === "/collectionschedule" ? "active" : ""}>Collection Schedule</Link>
          <Link to="/usercollector" className={location.pathname === "/usercollector" ? "active" : ""}>Users & Collectors</Link>
          <Link to="/reports" className={location.pathname === "/reports" ? "active" : ""}>Reports</Link>
          <Link to="/partnerships" className={location.pathname === "/partnerships" ? "active" : ""}>Partnerships</Link>
          <Link to="/notifications" className={location.pathname === "/notifications" ? "active" : ""}>Notifications</Link>
          <Link to="/pricingrule" className={location.pathname === "/pricingrule" ? "active" : ""}>Pricing rule</Link>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="title">
            {location.pathname === "/dashboard" && "Dashboard"}
            {location.pathname === "/collectionschedule" && "Collection Schedule Management"}
            {location.pathname === "/usercollector" && "Users & Collectors"}
            {location.pathname === "/reports" && "Reports"}
            {location.pathname === "/partnership" && "Partnership"}
            {location.pathname === "/notifications" && "Notifications"}
            {location.pathname === "/pricingrule" && "Pricing rule"}
          </div>
          <div className="icons">
            <button>⚙️</button>
            <button>🔔</button>
            <div className="avatar"></div>
          </div>
        </header>

        <Outlet /> {/* Page content goes here */}
      </main>
    </div>
  );
};

export default Layout;
