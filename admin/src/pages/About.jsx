import React from 'react';
import '../styles/About.css';

const About = () => {
  return (
    <div className="about-container">
      <div className="about-header">
        <div className="about-icon">
          <i className="fas fa-recycle"></i>
        </div>
        <h1>Waste Scheduling & Billing System</h1>
        <p className="version">Version 2.0.1</p>
      </div>

      <div className="about-content">
        <div className="about-section">
          <h2>
            <i className="fas fa-info-circle"></i>
            About This System
          </h2>
          <p>
            The Waste Scheduling & Billing System (WSBS) is a comprehensive solution designed 
            to streamline waste collection operations for private waste collectors in General Santos City. 
            Our system provides efficient scheduling, automated billing, and real-time tracking capabilities.
          </p>
        </div>

        <div className="about-section">
          <h2>
            <i className="fas fa-star"></i>
            Key Features
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <i className="fas fa-calendar-alt"></i>
              <h3>Smart Scheduling</h3>
              <p>Automated waste collection scheduling with barangay-based assignments</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-file-invoice-dollar"></i>
              <h3>Automated Billing</h3>
              <p>Generate invoices automatically with flexible payment tracking</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-map-marked-alt"></i>
              <h3>Route Optimization</h3>
              <p>Efficient collector assignments based on geographic coverage</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-mobile-alt"></i>
              <h3>Mobile App</h3>
              <p>Dedicated mobile application for collectors and subscribers</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-chart-line"></i>
              <h3>Analytics Dashboard</h3>
              <p>Real-time insights and comprehensive reporting tools</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-bell"></i>
              <h3>Notifications</h3>
              <p>Automated alerts for payments, schedules, and system updates</p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>
            <i className="fas fa-users"></i>
            Development Team
          </h2>
          <div className="team-info">
            <p><strong>Developed by:</strong> WSBS Development Team</p>
            <p><strong>Project Type:</strong> Waste Management Solution</p>
            <p><strong>Technology Stack:</strong> React.js, Node.js, PostgreSQL</p>
            <p><strong>Target Location:</strong> General Santos City, Philippines</p>
          </div>
        </div>

        <div className="about-section">
          <h2>
            <i className="fas fa-cog"></i>
            System Information
          </h2>
          <div className="system-info">
            <div className="info-row">
              <span className="info-label">Frontend:</span>
              <span className="info-value">React.js 18.2.0</span>
            </div>
            <div className="info-row">
              <span className="info-label">Backend:</span>
              <span className="info-value">Node.js with Express</span>
            </div>
            <div className="info-row">
              <span className="info-label">Database:</span>
              <span className="info-value">PostgreSQL</span>
            </div>
            <div className="info-row">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">October 2024</span>
            </div>
            <div className="info-row">
              <span className="info-label">License:</span>
              <span className="info-value">Private Use</span>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>
            <i className="fas fa-envelope"></i>
            Support & Contact
          </h2>
          <div className="contact-info">
            <p>For technical support or inquiries about the system:</p>
            <div className="contact-methods">
              <div className="contact-method">
                <i className="fas fa-envelope"></i>
                <span>support@wsbs-gensan.com</span>
              </div>
              <div className="contact-method">
                <i className="fas fa-phone"></i>
                <span>+63 (083) XXX-XXXX</span>
              </div>
              <div className="contact-method">
                <i className="fas fa-map-marker-alt"></i>
                <span>General Santos City, Philippines</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="about-footer">
        <p>&copy; 2024 Waste Scheduling & Billing System. All rights reserved.</p>
        <p>Designed for efficient waste management operations in General Santos City.</p>
      </div>
    </div>
  );
};

export default About;
