// db.js
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
  .then(() => console.log('✅ Database connected successfully!'))
  .catch(err => console.error('❌ Database connection error:', err));

// Error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Export both the pool and a query function
module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};