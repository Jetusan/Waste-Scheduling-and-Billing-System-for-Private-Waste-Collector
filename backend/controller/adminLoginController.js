const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getAdminUserByUsername } = require('../models/adminModel');

const adminLogin = async (req, res) => {
  console.log('Admin login endpoint hit', req.body);
  try {
    const { username, password } = req.body;
    console.log('Admin login attempt:', { username, password });
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Get admin user from database
    const adminUser = await getAdminUserByUsername(username);
    console.log('Admin user found in DB:', adminUser);
    
    if (!adminUser) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, adminUser.password_hash);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    // Generate JWT specifically for admin users
    const token = jwt.sign(
      { 
        userId: adminUser.user_id, 
        username: adminUser.username, 
        role: adminUser.role 
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { 
        expiresIn: '1d' 
      }
    );

    // Log authentication success in the terminal
    console.log(`✅ Admin user '${username}' authenticated successfully`);
    res.json({ 
      success: true, 
      token, 
      user: { 
        userId: adminUser.user_id, 
        username: adminUser.username, 
        role: adminUser.role 
      } 
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Admin login failed. Please try again.' });
  }
};

// Create an admin user (for initial setup only)
const createAdminUser = async (req, res) => {
  try {
    const { username, password, firstName, middleName, lastName, contactNumber } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    
    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const adminData = {
      username,
      password_hash,
      firstName,
      middleName,
      lastName,
      contactNumber
    };
    
    const newAdmin = await adminModel.createAdminUser(adminData);
    
    res.status(201).json({ 
      success: true,
      message: 'Admin user created successfully',
      user: newAdmin
    });
  } catch (err) {
    console.error('Admin user creation error:', err);
    if (err.message && err.message.includes('duplicate key')) {
      return res.status(400).json({ message: 'Username already exists.' });
    }
    res.status(500).json({ message: 'Failed to create admin user.' });
  }
};

module.exports = { adminLogin, createAdminUser };
