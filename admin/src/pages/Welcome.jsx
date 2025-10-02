import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="welcome-container">
      {/* Navigation Header */}
      <nav className={`welcome-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          <div className="logo-section" onClick={() => scrollToSection('hero')}>
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="12" fill="#4CAF50"/>
                <path d="M12 16L20 12L28 16V26C28 27.1046 27.1046 28 26 28H14C12.8954 28 12 27.1046 12 26V16Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 24V20H24V24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">WSBS Admin</span>
          </div>
          <div className="nav-menu">
            <button className="nav-link" onClick={() => scrollToSection('features')}>Features</button>
            <button className="nav-link" onClick={() => scrollToSection('stats')}>Analytics</button>
            <button className="nav-link" onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button className="nav-login-btn" onClick={handleGetStarted}>
              Get Started
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.33333 8H12.6667M12.6667 8L8.66667 4M12.6667 8L8.66667 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-background">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
          </div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1L10.09 5.26L15 6L11 9.74L11.91 14.74L8 12.77L4.09 14.74L5 9.74L1 6L5.91 5.26L8 1Z" fill="currentColor"/>
              </svg>
              <span>Trusted by 500+ Companies</span>
            </div>
            <h1 className="hero-title">
              Complete Admin Control for
              <span className="hero-highlight"> Waste Management</span>
              <br />Operations
            </h1>
            <p className="hero-description">
              Powerful admin dashboard to manage your entire waste collection ecosystem. 
              Monitor operations, track performance, manage teams, and oversee billing - 
              all from one centralized command center designed for administrators.
            </p>
            <div className="hero-actions">
              <button className="cta-button primary" onClick={handleGetStarted}>
                Start Free Trial
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="cta-button secondary" onClick={() => scrollToSection('demo')}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.33333 6.66667L13.3333 10L8.33333 13.3333V6.66667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Watch Demo
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-preview">
                <div className="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <strong>500+</strong>
                  <span>Admin Users</span>
                </div>
              </div>
              <div className="stat-preview">
                <div className="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <strong>99.9%</strong>
                  <span>System Uptime</span>
                </div>
              </div>
              <div className="stat-preview">
                <div className="stat-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7M3 7L12 2L21 7M3 7L12 12L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <strong>24/7</strong>
                  <span>Admin Support</span>
                </div>
              </div>
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
                <div className="preview-title">WSBS Admin Dashboard</div>
                <div className="preview-badge">Live</div>
              </div>
              <div className="preview-content">
                <div className="preview-sidebar">
                  <div className="sidebar-item active" title="Home"></div>
                  <div className="sidebar-item" title="Operations"></div>
                  <div className="sidebar-item" title="Billing"></div>
                  <div className="sidebar-item" title="Reports"></div>
                  <div className="sidebar-item" title="Settings"></div>
                </div>
                <div className="preview-main">
                  <div className="preview-header-section">
                    <div className="preview-breadcrumb">Home / Dashboard Overview</div>
                    <div className="preview-time">Real-time Data</div>
                  </div>
                  <div className="preview-cards">
                    <div className="preview-card green">
                      <div className="card-icon">📊</div>
                      <div className="card-content">
                        <div className="card-title">Active Routes</div>
                        <div className="card-value">24</div>
                      </div>
                    </div>
                    <div className="preview-card blue">
                      <div className="card-icon">👥</div>
                      <div className="card-content">
                        <div className="card-title">Team Members</div>
                        <div className="card-value">156</div>
                      </div>
                    </div>
                    <div className="preview-card orange">
                      <div className="card-icon">💰</div>
                      <div className="card-content">
                        <div className="card-title">Revenue</div>
                        <div className="card-value">$45K</div>
                      </div>
                    </div>
                  </div>
                  <div className="preview-chart">
                    <div className="chart-header">
                      <span className="chart-title">Collection Performance</span>
                      <span className="chart-period">This Week</span>
                    </div>
                    <div className="chart-bars">
                      <div className="bar" style={{height: '60%'}} title="Mon: 85%"></div>
                      <div className="bar" style={{height: '80%'}} title="Tue: 92%"></div>
                      <div className="bar" style={{height: '45%'}} title="Wed: 78%"></div>
                      <div className="bar" style={{height: '90%'}} title="Thu: 96%"></div>
                      <div className="bar" style={{height: '70%'}} title="Fri: 88%"></div>
                    </div>
                    <div className="chart-labels">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-content">
          <div className="section-header">
            <div className="section-badge">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1L10.09 5.26L15 6L11 9.74L11.91 14.74L8 12.77L4.09 14.74L5 9.74L1 6L5.91 5.26L8 1Z" fill="currentColor"/>
              </svg>
              <span>Powerful Features</span>
            </div>
            <h2>Comprehensive Admin Control Center</h2>
            <p>Everything administrators need to manage, monitor, and optimize waste collection operations efficiently</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-wrapper schedule">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <h3>Operations Management</h3>
              <p>Complete oversight of collection schedules, route assignments, and team coordination from a centralized admin interface.</p>
              <div className="feature-tags">
                <span className="tag">Route Control</span>
                <span className="tag">Team Assignment</span>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-wrapper billing">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <h3>Financial Administration</h3>
              <p>Comprehensive billing oversight, payment monitoring, and financial reporting with admin-level controls and insights.</p>
              <div className="feature-tags">
                <span className="tag">Billing Control</span>
                <span className="tag">Financial Reports</span>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-wrapper analytics">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <h3>System Analytics</h3>
              <p>Advanced reporting and analytics dashboard for administrators to monitor system performance and operational metrics.</p>
              <div className="feature-tags">
                <span className="tag">Admin Reports</span>
                <span className="tag">System Metrics</span>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <div className="icon-wrapper team">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <h3>User Administration</h3>
              <p>Complete user management system for administrators to control access, manage roles, and oversee all system users.</p>
              <div className="feature-tags">
                <span className="tag">User Control</span>
                <span className="tag">Access Management</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="stats-section">
        <div className="stats-content">
          <div className="stats-header">
            <h2>Trusted by Industry Leaders</h2>
            <p>Join thousands of companies who have transformed their waste management operations</p>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 2L20.18 10.52L30 12L22 19.48L23.82 29.48L16 25.54L8.18 29.48L10 19.48L2 12L11.82 10.52L16 2Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-number">500+</div>
              <div className="stat-label">Active Companies</div>
              <div className="stat-trend positive">↑ 12% this month</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M26 14H20L16 28L12 4L6 14H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-number">98%</div>
              <div className="stat-label">Collection Efficiency</div>
              <div className="stat-trend positive">↑ 5% improvement</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 8V16L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-number">24/7</div>
              <div className="stat-label">System Uptime</div>
              <div className="stat-trend neutral">99.9% reliability</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16L8 12L16 20L28 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-number">50+</div>
              <div className="stat-label">Routes Optimized</div>
              <div className="stat-trend positive">↓ 30% fuel savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="pricing-content">
          <div className="section-header">
            <div className="section-badge">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1L10.09 5.26L15 6L11 9.74L11.91 14.74L8 12.77L4.09 14.74L5 9.74L1 6L5.91 5.26L8 1Z" fill="currentColor"/>
              </svg>
              <span>Simple Pricing</span>
            </div>
            <h2>Choose Your Plan</h2>
            <p>Start free and scale as you grow. No hidden fees, no surprises.</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Starter</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">49</span>
                  <span className="period">/month</span>
                </div>
                <p>Perfect for small operations</p>
              </div>
              <div className="pricing-features">
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Up to 5 routes</span>
                </div>
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Basic analytics</span>
                </div>
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Email support</span>
                </div>
              </div>
              <button className="pricing-btn secondary">Get Started</button>
            </div>
            <div className="pricing-card featured">
              <div className="popular-badge">Most Popular</div>
              <div className="pricing-header">
                <h3>Professional</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">149</span>
                  <span className="period">/month</span>
                </div>
                <p>Best for growing businesses</p>
              </div>
              <div className="pricing-features">
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Unlimited routes</span>
                </div>
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Advanced analytics</span>
                </div>
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Priority support</span>
                </div>
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>API access</span>
                </div>
              </div>
              <button className="pricing-btn primary" onClick={handleGetStarted}>Start Free Trial</button>
            </div>
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Enterprise</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">399</span>
                  <span className="period">/month</span>
                </div>
                <p>For large-scale operations</p>
              </div>
              <div className="pricing-features">
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Everything in Pro</span>
                </div>
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Custom integrations</span>
                </div>
                <div className="feature">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Dedicated support</span>
                </div>
              </div>
              <button className="pricing-btn secondary">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-background">
          <div className="cta-shapes">
            <div className="cta-shape cta-shape-1"></div>
            <div className="cta-shape cta-shape-2"></div>
            <div className="cta-shape cta-shape-3"></div>
          </div>
        </div>
        <div className="cta-content">
          <div className="cta-text">
            <h2>Ready to take control of your operations?</h2>
            <p>Join hundreds of administrators who have streamlined their waste management operations with our comprehensive admin platform. Experience the power of centralized control.</p>
          </div>
          <div className="cta-actions">
            <button className="cta-button primary large" onClick={handleGetStarted}>
              Start Your Free Trial
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="cta-benefits">
              <div className="benefit">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>No setup fees</span>
              </div>
              <div className="benefit">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Complete admin access</span>
              </div>
              <div className="benefit">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>24/7 admin support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="logo-section">
                <div className="logo-icon">
                  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="40" height="40" rx="12" fill="#4CAF50"/>
                    <path d="M12 16L20 12L28 16V26C28 27.1046 27.1046 28 26 28H14C12.8954 28 12 27.1046 12 26V16Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 24V20H24V24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="logo-text">WSBS Admin</span>
              </div>
              <p>Waste Scheduling and Billing System</p>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#integrations">Integrations</a>
              </div>
              <div className="link-group">
                <h4>Resources</h4>
                <a href="#docs">Documentation</a>
                <a href="#support">Support</a>
                <a href="#blog">Blog</a>
              </div>
              <div className="link-group">
                <h4>Company</h4>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
                <a href="#careers">Careers</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 WSBS Admin. All rights reserved.</p>
            <div className="footer-legal">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;