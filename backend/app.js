const express = require('express');
const cors = require('cors');
const path = require('path');
// Only import the routes we actually need
const collectionSchedulesRouter = require('./routes/collectionSchedules');
const authRouter = require('./routes/auth');
const billingRouter = require('./routes/billing');
const dashboardRouter = require('./routes/dashboard'); // Add dashboard routes
const barangaysRouter = require('./routes/barangays-fixed'); // Enable barangays route
const specialPickupRouter = require('./routes/specialPickup'); // Special pickup route
// UserCollector related routes
const residentsRouter = require('./routes/residents');
const collectorsRouter = require('./routes/collectors');
const trucksRouter = require('./routes/trucks');
const collectorAssignmentsRoutes = require('./routes/collectorAssignments');
const collectorIssuesRoutes = require('./routes/collectorIssues');
const { router: nextScheduleRoutes } = require('./routes/nextScheduleCalculator');
const debugAssignmentsRouter = require('./routes/debugAssignments');
const assignmentsRouter = require('./routes/assignments');
// const adminAuthRouter = require('./routes/adminAuth'); // Temporarily commented out

// Add this near your other route imports
const emailVerificationRoutes = require('./routes/emailVerification');
const adminRegistrationsRouter = require('./routes/adminRegistrations');
const testEmailRouter = require('./routes/test-email');
const notificationsRouter = require('./routes/notifications');
const chatRouter = require('./routes/chat');
const collectorRouter = require('./routes/collector');
const feedbackRouter = require('./routes/feedback');
const collectorEmergencyRouter = require('./routes/collectorEmergency');
const reportsRouter = require('./routes/reports');

const app = express();

// Initialize automated notification scheduler
const { initializeNotificationScheduler } = require('./services/automatedNotificationScheduler');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', emailVerificationRoutes);

// Initialize notification scheduler after app setup
initializeNotificationScheduler();

// Debug middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 Incoming request: ${req.method} ${req.originalUrl}`);
  console.log(`📄 Headers:`, req.headers);
  next();
});

// Serve uploaded files (proof images) statically
// Multer stores files under 'uploads/' relative to backend root
// This makes them accessible at http://localhost:<PORT>/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/receipt', require('./routes/receipt'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/collection-schedules', collectionSchedulesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/special-pickup', specialPickupRouter);
app.use('/api/admin', require('./routes/adminAuth')); // Add admin auth routes
app.use('/api/barangays', barangaysRouter); // Enable barangays route
app.use('/api/special-pickup', specialPickupRouter); // Special pickup route
// UserCollector related routes - all enabled
app.use('/api/residents', residentsRouter);
app.use('/api/collectors', collectorsRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/collector/assignments', collectorAssignmentsRoutes);
app.use('/api/collector/issues', collectorIssuesRoutes);
app.use('/api/collector/issues', require('./routes/collectorIssuesAdmin'));
app.use('/api/schedules', nextScheduleRoutes);
app.use('/api/admin/registrations', adminRegistrationsRouter);
app.use('/api/debug', debugAssignmentsRouter);
app.use('/api/test-email', testEmailRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/collector', collectorRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/collector/emergency', collectorEmergencyRouter);
app.use('/api/reports', reportsRouter);

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