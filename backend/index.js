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

const PORT = process.env.PORT || config.PORT;

// Test database connection using pool.query() instead of pool.connect()
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connected successfully!');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

// Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: ${config.BASE_URL}`);
  console.log(`Local URL: ${config.LOCALHOST_URL}`);
  console.log(`🎯 Server is now ready to handle requests!`);
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