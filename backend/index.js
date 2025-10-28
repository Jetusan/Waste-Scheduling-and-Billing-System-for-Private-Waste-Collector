const dotenv = require('dotenv');
dotenv.config(); // Load environment variables FIRST

// Validate environment variables before starting the server
const { validateEnvironment } = require('./config/envValidator');
try {
  validateEnvironment();
} catch (error) {
  console.error('🚫 Server startup aborted due to environment validation errors');
  process.exit(1);
}

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
  console.log('🔍 Starting SMTP connection test...');
  console.log('📧 BREVO_SMTP_USER:', process.env.BREVO_SMTP_USER ? 'SET' : 'NOT SET');
  console.log('🔑 BREVO_SMTP_KEY:', process.env.BREVO_SMTP_KEY ? 'SET' : 'NOT SET');
  console.log('📤 BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL ? 'SET' : 'NOT SET');
  
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    console.log('⚠️ SMTP credentials not configured - email service disabled');
    console.log('Missing variables:', {
      BREVO_SMTP_USER: !process.env.BREVO_SMTP_USER,
      BREVO_SMTP_KEY: !process.env.BREVO_SMTP_KEY
    });
    return;
  }

  try {
    console.log('🔧 Creating SMTP transporter...');
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY
      },
      // Add connection timeout for production
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,     // 5 seconds
      socketTimeout: 10000       // 10 seconds
    });

    // Skip verification in production to avoid timeout issues
    if (process.env.NODE_ENV === 'production') {
      console.log('🏭 Production mode: Skipping SMTP verification');
      console.log('✅ SMTP service configured for production');
      console.log(`📧 Email service ready: ${process.env.BREVO_SMTP_USER}`);
    } else {
      console.log('🧪 Verifying SMTP connection...');
      
      // Add timeout wrapper for verification
      const verifyWithTimeout = () => {
        return Promise.race([
          transporter.verify(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SMTP verification timeout')), 15000)
          )
        ]);
      };

      await verifyWithTimeout();
      console.log('✅ SMTP connection successful!');
      console.log(`📧 Email service ready: ${process.env.BREVO_SMTP_USER}`);
    }
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.log('⚠️ Email service will be disabled');
    
    // In production, we'll skip verification but still allow email sending
    if (process.env.NODE_ENV === 'production') {
      console.log('📧 Production mode: Email service enabled without verification');
    }
  }
};

// Test SMTP connection immediately
testSMTPConnection();

// Also test SMTP connection after a delay (in case of timing issues)
setTimeout(() => {
  console.log('🔄 Running delayed SMTP test...');
  testSMTPConnection();
}, 2000);

// Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: ${config.BASE_URL}`);
  console.log(`Local URL: ${config.LOCALHOST_URL}`);
  console.log(`🎯 Server is now ready to handle requests!`);
  
  // Initialize WebSocket after server starts
  initializeWebSocket(server);
  
  // Initialize late fee scheduler
  try {
    const lateFeeScheduler = require('./services/lateFeeScheduler');
    lateFeeScheduler.start();
    console.log('✅ Late fee scheduler initialized');
  } catch (error) {
    console.error('❌ Failed to initialize late fee scheduler:', error);
  }
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