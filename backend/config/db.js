// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'waste_collection_db',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database connected successfully!'))
  .catch(err => console.error('❌ Database connection error:', err));

// Error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Enhanced query function that sets search path for Neon
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    // Set search path to public for Neon compatibility
    if (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')) {
      await client.query('SET search_path TO public');
    }
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Export both the pool and enhanced query function
module.exports = {
  pool,
  query
};