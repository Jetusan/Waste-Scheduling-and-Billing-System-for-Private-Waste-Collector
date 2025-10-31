const { pool } = require('./config/db');

async function checkReportSequence() {
  try {
    console.log('🔍 Checking report ID sequence...');
    
    // Get all report IDs to see if there are gaps
    const allReportsQuery = `
      SELECT report_id, type, status, created_at 
      FROM reports 
      ORDER BY report_id DESC 
      LIMIT 20;
    `;
    const allReports = await pool.query(allReportsQuery);
    
    console.log(`📊 Recent report IDs:`);
    allReports.rows.forEach(report => {
      console.log(`  - ID: ${report.report_id}, Type: ${report.type}, Status: ${report.status}, Created: ${report.created_at}`);
    });
    
    // Check for gaps in sequence
    const reportIds = allReports.rows.map(r => r.report_id).sort((a, b) => a - b);
    console.log('\n🔢 Report ID sequence:', reportIds);
    
    // Find missing IDs
    if (reportIds.length > 1) {
      const min = Math.min(...reportIds);
      const max = Math.max(...reportIds);
      const missing = [];
      
      for (let i = min; i <= max; i++) {
        if (!reportIds.includes(i)) {
          missing.push(i);
        }
      }
      
      if (missing.length > 0) {
        console.log('❌ Missing report IDs:', missing);
      } else {
        console.log('✅ No gaps in report ID sequence');
      }
    }
    
    // Check the current sequence value
    const sequenceQuery = `
      SELECT last_value, is_called 
      FROM reports_report_id_seq;
    `;
    try {
      const sequenceResult = await pool.query(sequenceQuery);
      console.log('\n🔢 Sequence info:', sequenceResult.rows[0]);
    } catch (seqError) {
      console.log('⚠️ Could not check sequence:', seqError.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking report sequence:', error);
  } finally {
    await pool.end();
  }
}

checkReportSequence();
