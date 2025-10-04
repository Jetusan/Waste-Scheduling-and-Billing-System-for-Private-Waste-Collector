// Diagnose Neon schema issues
require('dotenv').config();
const { pool } = require('./config/db');

const diagnoseSchema = async () => {
  console.log('🔍 Diagnosing Neon database schema...');
  
  try {
    // Check current search path
    const searchPath = await pool.query('SHOW search_path');
    console.log('📍 Current search_path:', searchPath.rows[0].search_path);
    
    // Check current database and user
    const currentInfo = await pool.query('SELECT current_database(), current_user, current_schema()');
    console.log('🗄️ Current database:', currentInfo.rows[0].current_database);
    console.log('👤 Current user:', currentInfo.rows[0].current_user);
    console.log('📂 Current schema:', currentInfo.rows[0].current_schema);
    
    // List all schemas
    const schemas = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log('📁 Available schemas:', schemas.rows.map(r => r.schema_name));
    
    // Check tables in public schema specifically
    const publicTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📊 Tables in public schema:', publicTables.rows.length);
    console.log('📋 First 10 tables:', publicTables.rows.slice(0, 10).map(r => r.table_name));
    
    // Check if users table exists in public schema
    const usersExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    console.log('👥 Users table exists in public schema:', usersExists.rows[0].exists);
    
    // Try to query users table with explicit schema
    try {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM public.users');
      console.log('✅ Users count (with explicit schema):', userCount.rows[0].count);
    } catch (error) {
      console.log('❌ Error querying public.users:', error.message);
    }
    
    // Check all tables across all schemas
    const allTables = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
      ORDER BY table_schema, table_name
    `);
    console.log('🔍 Users table found in schemas:', allTables.rows);
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  } finally {
    await pool.end();
  }
};

diagnoseSchema();
