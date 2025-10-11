// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'waste_collection_db',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Neon-optimized connection settings
  max: 5, // Reduced max connections for Neon free tier
  min: 0, // Allow pool to scale down to 0
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Connection timeout
  acquireTimeoutMillis: 10000, // Time to wait for connection from pool
  
  // Handle connection errors gracefully
  allowExitOnIdle: true // Allow process to exit when pool is idle
});

// Test connection
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database connected successfully!'))
  .catch(err => console.error('❌ Database connection error:', err));

// Enhanced error handling for Neon database
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err.message);
  
  // Log connection details for debugging
  if (err.message.includes('Connection terminated')) {
    console.log('🔌 Database client disconnected. Active connections:', pool.totalCount);
    console.log('💡 This is normal for Neon databases - connections auto-close when idle');
  }
});

pool.on('connect', (client) => {
  console.log('🔗 New database client connected. Active connections:', pool.totalCount);
});

pool.on('remove', (client) => {
  console.log('🔌 Database client removed. Active connections:', pool.totalCount);
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