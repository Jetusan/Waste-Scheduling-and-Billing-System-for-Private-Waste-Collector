// dbAdmin.js
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
  .then(() => console.log('✅ [Admin] Database connected successfully!'))
  .catch(err => console.error('❌ [Admin] Database connection error:', err));

// Enhanced error handling for Neon database
pool.on('error', (err) => {
  console.error('❌ [Admin] Unexpected error on idle client:', err.message);
  
  // Log connection details for debugging
  if (err.message.includes('Connection terminated')) {
    console.log('🔌 Database client disconnected. Active connections:', pool.totalCount);
    console.log('💡 This is normal for Neon databases - connections auto-close when idle');
  }
});

pool.on('connect', (client) => {
  console.log('🔗 [Admin] New database client connected. Active connections:', pool.totalCount);
});

pool.on('remove', (client) => {
  console.log('🔌 [Admin] Database client removed. Active connections:', pool.totalCount);
});

module.exports = pool;