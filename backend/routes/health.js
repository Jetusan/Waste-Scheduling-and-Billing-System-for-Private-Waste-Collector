// Health Check Routes
const express = require('express');
const router = express.Router();
const { dbManager } = require('../config/dbManager');

// Basic health check
router.get('/', async (req, res) => {
  try {
    const dbHealth = await dbManager.healthCheck();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      database: dbHealth,
      environment: process.env.NODE_ENV || 'development'
    };

    // Return 503 if database is unhealthy
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed database health check
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await dbManager.healthCheck();
    const poolStats = dbManager.getPoolStats();
    
    res.json({
      ...dbHealth,
      poolStats,
      recommendations: getPoolRecommendations(poolStats)
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get pool recommendations based on current stats
function getPoolRecommendations(stats) {
  const recommendations = [];
  
  if (stats.waitingCount > 0) {
    recommendations.push('Consider increasing max connections - queries are waiting for available connections');
  }
  
  if (stats.totalCount >= stats.maxConnections * 0.8) {
    recommendations.push('Connection pool is near capacity - monitor for potential bottlenecks');
  }
  
  if (stats.idleCount === 0 && stats.totalCount > 0) {
    recommendations.push('No idle connections available - all connections are busy');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Database connection pool is operating normally');
  }
  
  return recommendations;
}

// Readiness check (for Kubernetes/Docker health checks)
router.get('/ready', async (req, res) => {
  try {
    const dbHealth = await dbManager.healthCheck();
    
    if (dbHealth.status === 'healthy') {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database unhealthy' });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      reason: error.message 
    });
  }
});

// Liveness check (for Kubernetes/Docker health checks)
router.get('/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
