const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getUserByUsername } = require('../models/userModel');

const loginUser = async (req, res) => {
  console.log('Login endpoint hit', req.body);
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password });
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await getUserByUsername(username);
    console.log('User found in DB:', user);
    if (!user) {
      return res.status(401).json({ message: 'Username is incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password is incorrect.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );

    // Log authentication success in the terminal
    console.log(`✅ User '${username}' authenticated successfully (login)`);
    res.json({ success: true, token, user: { userId: user.user_id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

module.exports = { loginUser };
