import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ALogin.css';

// Predefined admin credentials (in production these should be in a secure backend)
const ADMIN_CREDENTIALS = {
  email: 'admin@wsbs.com',
  password: 'admin123'
};

const ALogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') === 'true') {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Check admin credentials
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      // Store admin session
      sessionStorage.setItem('adminAuth', 'true');
      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } else {
      setError('Invalid admin credentials');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Login</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter Admin ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button type="submit" className="login-button">Sign in</button>
        </form>
      </div>
    </div>
  );
};

export default ALogin;
