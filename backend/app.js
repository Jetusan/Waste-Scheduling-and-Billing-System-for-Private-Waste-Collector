const express = require('express');
const cors = require('cors');
const residentsRouter = require('./routes/residents');
const collectorsRouter = require('./routes/collectors');
const barangaysRouter = require('./routes/barangays');
const trucksRouter = require('./routes/trucks');
const collectionSchedulesRouter = require('./routes/collectionSchedules');
const authRouter = require('./routes/auth');
const billingRouter = require('./routes/billing');
const reportsRouter = require('./routes/reports');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/residents', residentsRouter);
app.use('/api/collectors', collectorsRouter);
app.use('/api/barangays', barangaysRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/collection-schedules', collectionSchedulesRouter);
app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/reports', reportsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        details: err.message 
    });
});

module.exports = app; 