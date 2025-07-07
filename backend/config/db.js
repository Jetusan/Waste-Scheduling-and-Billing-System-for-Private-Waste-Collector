const { Pool } = require('pg');
require('dotenv').config();

// Waste collection database pool (use this for all user-related operations)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'waste_collection_db',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully!');
  }
});

// Error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
