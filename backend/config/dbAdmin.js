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
  
  // Neon-optimized connection settings for better stability
  max: 3, // Further reduced for Neon free tier stability
  min: 0, // Allow pool to scale down to 0
  idleTimeoutMillis: 20000, // Shorter idle timeout (20 seconds)
  connectionTimeoutMillis: 15000, // Longer connection timeout
  acquireTimeoutMillis: 15000, // Longer acquire timeout
  
  // Enhanced error recovery
  allowExitOnIdle: false, // Keep process alive
  keepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // 10 second keep-alive delay
  
  // Query timeout to prevent hanging queries
  query_timeout: 30000, // 30 second query timeout
  statement_timeout: 30000 // 30 second statement timeout
});

// Test connection
pool.query('SELECT NOW()')
  .then(() => console.log('✅ [Admin] Database connected successfully!'))
  .catch(err => console.error('❌ [Admin] Database connection error:', err));

// Enhanced error handling for Neon database with retry logic
pool.on('error', (err) => {
  console.error('❌ [Admin] Unexpected error on idle client:', err.message);
  
  // Log connection details for debugging
  if (err.message.includes('Connection terminated') || err.message.includes('ECONNRESET')) {
    console.log('🔌 Database client disconnected. Active connections:', pool.totalCount);
    console.log('💡 This is normal for Neon databases - connections auto-close when idle');
    console.log('🔄 Connection will be automatically retried on next query');
  }
  
  // Handle specific Neon connection errors
  if (err.code === 'ECONNRESET' || err.code === '57P01' || err.code === '08006') {
    console.log('🔄 Detected Neon connection reset - this is expected behavior');
  }
});

// Add connection retry wrapper function
const queryWithRetry = async (text, params, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(text, params);
      if (attempt > 1) {
        console.log(`✅ Query succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.log(`❌ Query attempt ${attempt} failed:`, error.message);
      
      // Only retry on connection-related errors
      if (attempt < maxRetries && (
        error.code === 'ECONNRESET' || 
        error.code === '57P01' || 
        error.code === '08006' ||
        error.message.includes('Connection terminated') ||
        error.message.includes('connection ended unexpectedly')
      )) {
        console.log(`🔄 Retrying query in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      // Don't retry for other errors
      break;
    }
  }
  
  throw lastError;
};

// Export both pool and retry function
pool.queryWithRetry = queryWithRetry;

pool.on('connect', (client) => {
  console.log('🔗 [Admin] New database client connected. Active connections:', pool.totalCount);
});

pool.on('remove', (client) => {
  console.log('🔌 [Admin] Database client removed. Active connections:', pool.totalCount);
});

module.exports = pool;