const dotenv = require('dotenv');
dotenv.config(); // Load environment variables FIRST

const config = require('./config/config');

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // Don't exit immediately, give time to see the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit immediately, give time to see the error
});

const app = require('./app');
const { pool } = require('./config/db'); // Destructure the pool from exports
const { initializeWebSocket } = require('./services/websocketService');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || config.PORT;

// Test database connection using pool.query() instead of pool.connect()
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connected successfully!');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

// Test SMTP connection
const testSMTPConnection = async () => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    console.log('⚠️ SMTP credentials not configured - email service disabled');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY
      }
    });

    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    console.log(`📧 Email service ready: ${process.env.BREVO_SMTP_USER}`);
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.log('⚠️ Email service will be disabled');
  }
};

// Test SMTP connection
testSMTPConnection();

// Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: ${config.BASE_URL}`);
  console.log(`Local URL: ${config.LOCALHOST_URL}`);
  console.log(`🎯 Server is now ready to handle requests!`);
  
  // Initialize WebSocket after server starts
  initializeWebSocket(server);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port.`);
  }
});

// Keep the process alive
console.log('� Backend server is running. Press Ctrl+C to stop.');

// Optional: Add a heartbeat to keep the process active
setInterval(() => {
  console.log(`� Heartbeat: ${new Date().toLocaleTimeString()} - Server is alive`);
}, 60000); // Every 60 seconds