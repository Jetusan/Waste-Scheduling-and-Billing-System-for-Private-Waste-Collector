const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const validateFirebaseToken = require('./middleware/auth');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection and create tables if they don't exist
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS waste_collections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        status VARCHAR(50) NOT NULL,
        collection_date TIMESTAMP,
        waste_type VARCHAR(100),
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        collection_id INTEGER REFERENCES waste_collections(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
};

// Initialize database
pool.query('SELECT NOW()', async (err, result) => {
  if (err) {
    return console.error('Error connecting to the database:', err);
  }
  console.log('Successfully connected to PostgreSQL database');
  
  try {
    await createTables();
  } catch (err) {
    console.error('Failed to create tables:', err);
  }
});

// Protected test endpoint
app.get('/api/auth-test', validateFirebaseToken, async (req, res) => {
  try {
    res.json({ 
      message: 'Successfully authenticated!', 
      user: req.user 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example API endpoint
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, timestamp: result.rows[0].now, message: 'Database connection successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User registration endpoint
app.post('/api/users', async (req, res) => {
  const { firebase_uid, email, full_name, address, role } = req.body;
  
  try {
    console.log('📝 Registration attempt received:', {
      email,
      full_name,
      role
    });

    // Validate required fields
    if (!firebase_uid || !email || !full_name || !address || !role) {
      console.log('❌ Registration failed: Missing fields');
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firebase_uid', 'email', 'full_name', 'address', 'role'],
        received: req.body 
      });
    }

    console.log('Attempting to register user:', { firebase_uid, email, full_name });
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1 OR email = $2',
      [firebase_uid, email]
    );

    if (existingUser.rows.length > 0) {
      console.log('User already exists:', existingUser.rows[0]);
      return res.status(409).json({ error: 'User already exists' });
    }    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (firebase_uid, email, full_name, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [firebase_uid, email, full_name, address, role]
    );
    
    console.log('✅ User registered successfully:', {
      id: result.rows[0].id,
      email: result.rows[0].email,
      full_name: result.rows[0].full_name,
      role: result.rows[0].role,
      created_at: result.rows[0].created_at
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user profile endpoint
app.get('/api/users/:firebase_uid', async (req, res) => {
  try {
    console.log('Fetching user profile for:', req.params.firebase_uid);
    const result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.params.firebase_uid]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found:', req.params.firebase_uid);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User found:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user profile endpoint
app.put('/api/users/:firebase_uid', async (req, res) => {
  const { firebase_uid } = req.params;
  const { full_name, address } = req.body;
  
  try {
    const result = await db.query(
      'UPDATE users SET full_name = $1, address = $2 WHERE firebase_uid = $3 RETURNING *',
      [full_name, address, firebase_uid]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// List all users (for testing only)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json({
      count: result.rows.length,
      users: result.rows
    });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
