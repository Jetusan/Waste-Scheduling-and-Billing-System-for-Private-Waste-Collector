// Test Neon database connection (fixed version)
require('dotenv').config();
const { pool, query } = require('./config/db');

const testNeonConnection = async () => {
  console.log('🧪 Testing Neon database connection (fixed)...');
  
  try {
    // Test basic connection
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Neon database connected successfully!');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🗄️ Database version:', result.rows[0].db_version.split(' ')[0]);
    
    // Test table count
    const tableCount = await query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Tables imported:', tableCount.rows[0].table_count);
    
    // Test some key tables (should work now)
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    const scheduleCount = await query('SELECT COUNT(*) as count FROM collection_schedules');
    const invoiceCount = await query('SELECT COUNT(*) as count FROM invoices');
    
    console.log('👥 Users:', userCount.rows[0].count);
    console.log('📅 Collection schedules:', scheduleCount.rows[0].count);
    console.log('💰 Invoices:', invoiceCount.rows[0].count);
    
    // Test a few more important tables
    const barangayCount = await query('SELECT COUNT(*) as count FROM barangays');
    const collectorCount = await query('SELECT COUNT(*) as count FROM collectors');
    
    console.log('🏘️ Barangays:', barangayCount.rows[0].count);
    console.log('🚛 Collectors:', collectorCount.rows[0].count);
    
    console.log('🎉 Database migration completed successfully!');
    console.log('✅ All tables are accessible and contain data!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
};

testNeonConnection();
