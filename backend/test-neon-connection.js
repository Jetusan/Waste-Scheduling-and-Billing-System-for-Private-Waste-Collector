// Test Neon database connection
require('dotenv').config();
const { pool } = require('./config/db');

const testNeonConnection = async () => {
  console.log('🧪 Testing Neon database connection...');
  
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Neon database connected successfully!');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🗄️ Database version:', result.rows[0].db_version.split(' ')[0]);
    
    // Test table count
    const tableCount = await pool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Tables imported:', tableCount.rows[0].table_count);
    
    // Test some key tables with explicit schema
    const userCount = await pool.query('SELECT COUNT(*) as count FROM public.users');
    const scheduleCount = await pool.query('SELECT COUNT(*) as count FROM public.collection_schedules');
    const invoiceCount = await pool.query('SELECT COUNT(*) as count FROM public.invoices');
    
    console.log('👥 Users:', userCount.rows[0].count);
    console.log('📅 Collection schedules:', scheduleCount.rows[0].count);
    console.log('💰 Invoices:', invoiceCount.rows[0].count);
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
};

testNeonConnection();
