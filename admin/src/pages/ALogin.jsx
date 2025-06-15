import React, { useState } from 'react';
import '../styles/ALogin.css';
import logo from '../assets/images/LOGO.png';


const ALogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // OPTIONAL: Firebase or backend login logic goes here
    console.log('Logging in with', email, password);
    setError('');
    alert('Login submitted!');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo" />
          <h1>WSBS</h1>
        </div>

        <h2>Login</h2>

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
