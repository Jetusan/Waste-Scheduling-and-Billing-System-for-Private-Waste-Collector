import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="welcome-container">
      {/* Navigation Header */}
      <nav className="welcome-nav">
        <div className="nav-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="12" fill="#4CAF50"/>
                <path d="M12 16L20 12L28 16V26C28 27.1046 27.1046 28 26 28H14C12.8954 28 12 27.1046 12 26V16Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 24V20H24V24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">WSBS Admin</span>
          </div>
          <button className="nav-login-btn" onClick={handleGetStarted}>
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Waste Management
              <span className="hero-highlight"> Made Simple</span>
            </h1>
            <p className="hero-description">
              Streamline your waste collection operations with our comprehensive 
              admin dashboard. Manage schedules, track collections, handle billing, 
              and monitor your entire waste management system from one powerful platform.
            </p>
            <div className="hero-actions">
              <button className="cta-button primary" onClick={handleGetStarted}>
                Get Started
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="cta-button secondary">
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-title">Admin Dashboard</div>
              </div>
              <div className="preview-content">
                <div className="preview-sidebar">
                  <div className="sidebar-item active"></div>
                  <div className="sidebar-item"></div>
                  <div className="sidebar-item"></div>
                  <div className="sidebar-item"></div>
                </div>
                <div className="preview-main">
                  <div className="preview-cards">
                    <div className="preview-card green"></div>
                    <div className="preview-card blue"></div>
                    <div className="preview-card orange"></div>
                  </div>
                  <div className="preview-chart">
                    <div className="chart-bars">
                      <div className="bar" style={{height: '60%'}}></div>
                      <div className="bar" style={{height: '80%'}}></div>
                      <div className="bar" style={{height: '45%'}}></div>
                      <div className="bar" style={{height: '90%'}}></div>
                      <div className="bar" style={{height: '70%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-content">
          <div className="section-header">
            <h2>Everything you need to manage waste collection</h2>
            <p>Powerful tools designed for efficiency and ease of use</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon schedule">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Smart Scheduling</h3>
              <p>Optimize collection routes and schedules with intelligent algorithms and real-time updates.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon billing">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Automated Billing</h3>
              <p>Generate invoices, track payments, and manage subscriptions with automated billing workflows.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon analytics">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Real-time Analytics</h3>
              <p>Monitor performance with comprehensive reports and real-time insights into your operations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon team">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Team Management</h3>
              <p>Coordinate collectors, assign routes, and track team performance across all operations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-content">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Active Subscribers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">98%</div>
              <div className="stat-label">Collection Efficiency</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">System Monitoring</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Routes Managed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to streamline your waste management?</h2>
          <p>Join hundreds of waste management companies using WSBS to optimize their operations.</p>
          <button className="cta-button primary large" onClick={handleGetStarted}>
            Access Admin Dashboard
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="footer-content">
          <div className="footer-left">
            <div className="logo-section">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="12" fill="#4CAF50"/>
                  <path d="M12 16L20 12L28 16V26C28 27.1046 27.1046 28 26 28H14C12.8954 28 12 27.1046 12 26V16Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 24V20H24V24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="logo-text">WSBS</span>
            </div>
            <p>Waste Scheduling and Billing System</p>
          </div>
          <div className="footer-right">
            <p>&copy; 2024 WSBS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
