// Database Connection Manager - Unified connection handling
const { Pool } = require('pg');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.connectionCount = 0;
    this.maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS) || 20;
    this.connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000;
    this.idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT) || 10000;
    
    this.initializePool();
  }

  initializePool() {
    if (this.pool) {
      console.log('⚠️ Database pool already initialized');
      return;
    }

    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'waste_collection_db',
      password: process.env.DB_PASSWORD || 'root',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Connection pool settings
      max: this.maxConnections, // Maximum number of clients in the pool
      min: 2, // Minimum number of clients in the pool
      idleTimeoutMillis: this.idleTimeout, // Close idle clients after 10 seconds
      connectionTimeoutMillis: this.connectionTimeout, // Return error after 30 seconds if connection could not be established
      acquireTimeoutMillis: 60000, // Return error after 60 seconds if a client could not be checked out
    });

    // Connection event handlers
    this.pool.on('connect', (client) => {
      this.connectionCount++;
      console.log(`✅ Database client connected. Active connections: ${this.connectionCount}`);
    });

    this.pool.on('remove', (client) => {
      this.connectionCount--;
      console.log(`🔌 Database client disconnected. Active connections: ${this.connectionCount}`);
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ Unexpected error on idle database client:', err);
      // Don't exit the process, just log the error
    });

    // Test initial connection
    this.testConnection();

    // Set up monitoring
    this.setupMonitoring();
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      console.log('✅ Database connected successfully!');
      console.log(`📊 Database version: ${result.rows[0].db_version.split(' ')[0]}`);
      console.log(`⏰ Server time: ${result.rows[0].current_time}`);
      client.release();
    } catch (err) {
      console.error('❌ Database connection test failed:', err.message);
      throw err;
    }
  }

  setupMonitoring() {
    // Log pool stats every 5 minutes in development
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        console.log(`📊 DB Pool Stats - Total: ${this.pool.totalCount}, Idle: ${this.pool.idleCount}, Waiting: ${this.pool.waitingCount}`);
      }, 5 * 60 * 1000);
    }
  }

  // Enhanced query function with proper error handling and connection management
  async query(text, params = []) {
    const startTime = Date.now();
    let client;
    
    try {
      client = await this.pool.connect();
      
      // Set search path for Neon compatibility
      if (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')) {
        await client.query('SET search_path TO public');
      }
      
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, text.substring(0, 100) + '...');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Database query failed (${duration}ms):`, {
        error: error.message,
        query: text.substring(0, 100) + '...',
        params: params
      });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Transaction wrapper with automatic rollback on error
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Set search path for Neon compatibility
      if (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')) {
        await client.query('SET search_path TO public');
      }
      
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get pool statistics
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.maxConnections,
      connectionCount: this.connectionCount
    };
  }

  // Graceful shutdown
  async close() {
    if (this.pool) {
      console.log('🔌 Closing database connection pool...');
      await this.pool.end();
      this.pool = null;
      console.log('✅ Database connection pool closed');
    }
  }

  // Health check endpoint data
  async healthCheck() {
    try {
      const startTime = Date.now();
      const result = await this.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        connections: this.getPoolStats(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connections: this.getPoolStats(),
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing database connections...');
  await dbManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connections...');
  await dbManager.close();
  process.exit(0);
});

// Export the manager instance and legacy compatibility
module.exports = {
  // New unified interface
  dbManager,
  query: (text, params) => dbManager.query(text, params),
  transaction: (callback) => dbManager.transaction(callback),
  healthCheck: () => dbManager.healthCheck(),
  getPoolStats: () => dbManager.getPoolStats(),
  
  // Legacy compatibility - gradually migrate to dbManager
  pool: dbManager.pool
};
