const express = require('express');
const cors = require('cors');
// Only import the routes we actually need
const collectionSchedulesRouter = require('./routes/collectionSchedules');
const authRouter = require('./routes/auth');
const billingRouter = require('./routes/billing');
const barangaysRouter = require('./routes/barangays-fixed'); // Enable barangays route
// const adminAuthRouter = require('./routes/adminAuth'); // Temporarily commented out

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 Incoming request: ${req.method} ${req.originalUrl}`);
  console.log(`📄 Headers:`, req.headers);
  next();
});

// Routes - only the essential ones
app.use('/api/collection-schedules', collectionSchedulesRouter);
app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/barangays', barangaysRouter); // Enable barangays route
// app.use('/api/admin/auth', adminAuthRouter); // Temporarily commented out

// Temporary admin auth route
app.post('/api/admin/auth/login', async (req, res) => {
  console.log('===== ADMIN LOGIN ATTEMPT =====');
  console.log('Request body:', req.body);
  const { username, password } = req.body;
  
  try {
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const pool = require('./config/dbAdmin');
    
    console.log('Connecting to database...');
    
    // Query the database for admin user - check both username and email fields
    const query = `
      SELECT u.*, r.role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE (u.username = $1 OR u.email = $1) 
      AND r.role_id = 1
    `;
    
    console.log('Executing query with username:', username);
    const result = await pool.query(query, [username]);
    console.log('Query result:', result.rows);
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user not found in database');
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
    
    const adminUser = result.rows[0];
    console.log('Found admin user:', {
      user_id: adminUser.user_id,
      username: adminUser.username,
      role_id: adminUser.role_id,
      role_name: adminUser.role_name
    });
    
    // Check password
    console.log('Comparing password...');
    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
    console.log('Password comparison result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: adminUser.user_id, username: adminUser.username, role: 'admin' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );
    
    console.log('✅ Admin login successful');
    res.json({ 
      success: true, 
      token, 
      user: { 
        userId: adminUser.user_id, 
        username: adminUser.username, 
        role: 'admin' 
      } 
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
  console.log('===== END ADMIN LOGIN ATTEMPT =====');
});

app.get('/success', (req, res) => {
  res.send('Payment successful! Thank you.');
});

app.get('/failed', (req, res) => {
  res.send('Payment failed or was cancelled.');
});

// Log all 404 requests
app.use((req, res, next) => {
    console.error(`❌ 404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        details: err.message 
    });
});

module.exports = app; 