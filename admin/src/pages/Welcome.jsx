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
            <button className="nav-link" onClick={() => scrollToSection('about')}>About</button>
            <button className="nav-link" onClick={() => scrollToSection('contact')}>Contact</button>
            <button className="nav-login-btn" onClick={handleGetStarted}>
              Admin Login
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
                Access Admin Dashboard
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="cta-button secondary" onClick={() => scrollToSection('contact')}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Contact Support
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

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-content">
          <div className="section-header">
            <div className="section-badge">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1L10.09 5.26L15 6L11 9.74L11.91 14.74L8 12.77L4.09 14.74L5 9.74L1 6L5.91 5.26L8 1Z" fill="currentColor"/>
              </svg>
              <span>About WSBS</span>
            </div>
            <h2>Revolutionizing Waste Management Through Technology</h2>
            <p>Discover how WSBS transforms traditional waste collection into an intelligent, efficient, and sustainable operation</p>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <div className="about-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#4CAF50" fillOpacity="0.1"/>
                  <path d="M24 12L32 16V28C32 29.1046 31.1046 30 30 30H18C16.8954 30 16 29.1046 16 28V16L24 12Z" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 26V22H28V26" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Smart Automation</h3>
              <p>WSBS leverages cutting-edge technology to automate waste collection scheduling, route optimization, and billing processes. Our intelligent system reduces manual work by 80% while increasing operational efficiency.</p>
            </div>
            <div className="about-card">
              <div className="about-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#2196F3" fillOpacity="0.1"/>
                  <path d="M24 8C31.732 8 38 14.268 38 22C38 29.732 31.732 36 24 36C16.268 36 10 29.732 10 22C10 14.268 16.268 8 24 8Z" stroke="#2196F3" strokeWidth="2"/>
                  <path d="M24 16V22L28 26" stroke="#2196F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Real-Time Intelligence</h3>
              <p>Experience the power of real-time data analytics and monitoring. Track collection progress, monitor team performance, and make data-driven decisions with our comprehensive dashboard that updates every second.</p>
            </div>
            <div className="about-card">
              <div className="about-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#FF9800" fillOpacity="0.1"/>
                  <path d="M14 20H34V34C34 35.1046 33.1046 36 32 36H16C14.8954 36 14 35.1046 14 34V20Z" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 12V20" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28 12V20" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Sustainable Impact</h3>
              <p>Built with environmental consciousness at its core, WSBS optimizes routes to reduce carbon emissions, minimizes waste through intelligent scheduling, and promotes sustainable practices across all operations.</p>
            </div>
          </div>
          <div className="about-stats">
            <div className="about-stat">
              <div className="stat-number">95%</div>
              <div className="stat-label">Efficiency Increase</div>
            </div>
            <div className="about-stat">
              <div className="stat-number">50+</div>
              <div className="stat-label">Cities Served</div>
            </div>
            <div className="about-stat">
              <div className="stat-number">24/7</div>
              <div className="stat-label">System Reliability</div>
            </div>
            <div className="about-stat">
              <div className="stat-number">100K+</div>
              <div className="stat-label">Households Connected</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="contact-content">
          <div className="section-header">
            <div className="section-badge">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1L10.09 5.26L15 6L11 9.74L11.91 14.74L8 12.77L4.09 14.74L5 9.74L1 6L5.91 5.26L8 1Z" fill="currentColor"/>
              </svg>
              <span>Get in Touch</span>
            </div>
            <h2>Contact Our Development Team</h2>
            <p>Have questions about WSBS or need technical support? Reach out to our dedicated development team</p>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Email</h3>
              <p>For technical inquiries, feature requests, or general support</p>
              <a href="mailto:jetusan0o0@gmail.com" className="contact-link">
                jetusan0o0@gmail.com
              </a>
            </div>
            <div className="contact-card">
              <div className="contact-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7293C21.7209 20.9845 21.5573 21.2136 21.3521 21.4019C21.1468 21.5901 20.9046 21.7335 20.6407 21.8227C20.3769 21.9119 20.0974 21.9451 19.82 21.92C16.7428 21.5856 13.787 20.5341 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.18999 12.85C3.49997 10.2412 2.44824 7.27099 2.11999 4.18C2.095 3.90347 2.12787 3.62476 2.21649 3.36162C2.30512 3.09849 2.44756 2.85669 2.63476 2.65162C2.82196 2.44655 3.0498 2.28271 3.30379 2.17052C3.55777 2.05833 3.83233 2.00026 4.10999 2H7.10999C7.59531 1.99522 8.06579 2.16708 8.43376 2.48353C8.80173 2.79999 9.04207 3.23945 9.10999 3.72C9.23662 4.68007 9.47144 5.62273 9.80999 6.53C9.94454 6.88792 9.97366 7.27691 9.8939 7.65088C9.81415 8.02485 9.62886 8.36811 9.35999 8.64L8.08999 9.91C9.51355 12.4135 11.5865 14.4864 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9751 14.1858 16.3491 14.1061C16.7231 14.0263 17.1121 14.0555 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7658 14.9585 21.2094 15.2032 21.5265 15.5775C21.8437 15.9518 22.0122 16.4296 22 16.92Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Mobile</h3>
              <p>Direct line for urgent technical support and consultations</p>
              <a href="tel:+639916771885" className="contact-link">
                +63 991 677 1885
              </a>
            </div>
            <div className="contact-card">
              <div className="contact-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 19C-2 19 -2 5 9 5C20 5 20 19 9 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 13.5C15.8284 13.5 16.5 12.8284 16.5 12C16.5 11.1716 15.8284 10.5 15 10.5C14.1716 10.5 13.5 11.1716 13.5 12C13.5 12.8284 14.1716 13.5 15 13.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>GitHub</h3>
              <p>Explore the source code, report issues, and contribute to development</p>
              <a href="https://github.com/Jetusan" target="_blank" rel="noopener noreferrer" className="contact-link">
                github.com/Jetusan
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 12M12 4H8M12 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
          <div className="contact-cta">
            <div className="contact-cta-content">
              <h3>Ready to Transform Your Waste Management?</h3>
              <p>Join the revolution in smart waste collection and experience the future of environmental management</p>
              <button className="cta-button primary" onClick={handleGetStarted}>
                Get Started Today
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="welcome-footer">
        <div className="footer-content">
          <div className="footer-simple">
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
              <p>Waste Scheduling and Billing System - Administrative Portal</p>
            </div>
            <div className="footer-bottom">
              <p>&copy; 2024 WSBS Admin. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;