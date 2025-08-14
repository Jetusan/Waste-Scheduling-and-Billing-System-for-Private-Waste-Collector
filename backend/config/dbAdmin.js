// dbAdmin.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'waste_collection_db',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432
});

// Test connection
pool.query('SELECT NOW()')
  .then(() => console.log('✅ [Admin] Database connected successfully!'))
  .catch(err => console.error('❌ [Admin] Database connection error:', err));

pool.on('error', (err) => {
  console.error('[Admin] Unexpected error on idle client', err);
});

module.exports = pool;