import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/ALogin.css';
import API_CONFIG, { buildApiUrl } from '../config/api';

// Admin login API endpoint (built from environment-based API config)
const ADMIN_LOGIN_API = buildApiUrl(API_CONFIG.ENDPOINTS.ADMIN_LOGIN);


const ALogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');

  // Check if already logged in
  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') === 'true') {
      navigate(redirect || '/admin/dashboard', { replace: true });
    }
  }, [navigate, redirect]);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Removed temporary hardcoded credentials check
    // All authentication now goes through the backend API

    try {
      // Call backend admin login API
      const response = await fetch(ADMIN_LOGIN_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send both email and username for compatibility
        body: JSON.stringify({ email, username: email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        data = {};
      }

      if (response.ok && (data.success || data.token)) {
        // Store admin session and token
        sessionStorage.setItem('adminAuth', 'true');
        if (data.token) sessionStorage.setItem('adminToken', data.token);
        // Also store in localStorage for API calls that read from localStorage
        if (data.token) localStorage.setItem('adminToken', data.token);
        sessionStorage.removeItem('tempAdmin'); // Remove temp flag if exists
        // Redirect to intended page or dashboard
        navigate(redirect || '/admin/dashboard', { replace: true });
      } else {
        const serverMsg = data?.message || data?.error || `Login failed (status ${response.status})`;
        setError(serverMsg);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Login failed. Please try again.');
    }
  };

  const handleBackToWelcome = () => {
    navigate('/');
  };

  return (
    <div className="login-container">
      {/* Navigation Header */}
      <nav className="login-nav">
        <div className="nav-content">
          <div className="logo-section" onClick={handleBackToWelcome}>
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="12" fill="#4CAF50"/>
                <path d="M12 16L20 12L28 16V26C28 27.1046 27.1046 28 26 28H14C12.8954 28 12 27.1046 12 26V16Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 24V20H24V24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">WSBS Admin</span>
          </div>
          <button className="back-btn" onClick={handleBackToWelcome}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.8333 10H4.16667M4.16667 10L9.16667 15M4.16667 10L9.16667 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Home
          </button>
        </div>
      </nav>

      {/* Login Content */}
      <div className="login-content">
        <div className="login-left">
          <div className="login-hero">
            <h1>Welcome Back</h1>
            <p>Sign in to access your WSBS admin dashboard and manage your waste collection operations efficiently.</p>
            <div className="login-features">
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Secure Admin Access</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Real-time Dashboard</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Complete Management Suite</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-box">
            <div className="login-header">
              <h2>Admin Sign In</h2>
              <p>Enter your credentials to access the dashboard</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>
              
              <button type="submit" className="login-button">
                Sign In to Dashboard
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.16667 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>

            <div className="login-footer">
              <p>Need help? Contact your system administrator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ALogin;