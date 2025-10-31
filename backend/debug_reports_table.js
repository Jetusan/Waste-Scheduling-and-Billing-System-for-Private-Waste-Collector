const { pool } = require('./config/db');

async function debugReportsTable() {
  try {
    console.log('🔍 Debugging reports table...');
    
    // Check if reports table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
      );
    `;
    const tableExists = await pool.query(tableExistsQuery);
    console.log('📋 Reports table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get table structure
      const structureQuery = `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reports' 
        ORDER BY ordinal_position;
      `;
      const structure = await pool.query(structureQuery);
      console.log('📊 Table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Get recent reports
      const recentReportsQuery = `
        SELECT report_id, type, generated_by, date, status, created_at 
        FROM reports 
        ORDER BY created_at DESC 
        LIMIT 5;
      `;
      const recentReports = await pool.query(recentReportsQuery);
      console.log(`📈 Recent reports (${recentReports.rows.length}):`);
      recentReports.rows.forEach(report => {
        console.log(`  - ID: ${report.report_id}, Type: ${report.type}, Status: ${report.status}, Created: ${report.created_at}`);
      });
      
      // Check for report ID 187 specifically
      const specificReportQuery = `SELECT * FROM reports WHERE report_id = 187`;
      const specificReport = await pool.query(specificReportQuery);
      console.log(`🎯 Report ID 187 exists:`, specificReport.rows.length > 0);
      if (specificReport.rows.length > 0) {
        const report = specificReport.rows[0];
        console.log(`  - Type: ${report.type}`);
        console.log(`  - Status: ${report.status}`);
        console.log(`  - Data length: ${JSON.stringify(report.data).length} chars`);
        console.log(`  - Created: ${report.created_at}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging reports table:', error);
  } finally {
    await pool.end();
  }
}

debugReportsTable();
