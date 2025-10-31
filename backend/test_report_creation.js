const { pool } = require('./config/db');

async function testReportCreation() {
  try {
    console.log('🧪 Testing report creation...');
    
    // Create a simple test report
    const insertQuery = `
      INSERT INTO reports (type, period, generated_by, date, status, data, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const testData = {
      summary: { totalCollections: 5, completed: 3, missed: 2 },
      collections: [
        { id: 1, status: 'collected', resident_name: 'Test User 1' },
        { id: 2, status: 'missed', resident_name: 'Test User 2' }
      ]
    };
    
    const result = await pool.query(insertQuery, [
      'collection-report',
      'custom',
      'Test System',
      new Date().toISOString().split('T')[0],
      'Completed',
      JSON.stringify(testData),
      '2025-10-31',
      '2025-10-31'
    ]);
    
    const newReportId = result.rows[0].report_id;
    console.log('✅ Test report created with ID:', newReportId);
    
    // Immediately verify it exists
    const verifyQuery = `SELECT * FROM reports WHERE report_id = $1`;
    const verifyResult = await pool.query(verifyQuery, [newReportId]);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Test report verification successful');
      console.log('Report details:', {
        id: verifyResult.rows[0].report_id,
        type: verifyResult.rows[0].type,
        status: verifyResult.rows[0].status,
        data_length: JSON.stringify(verifyResult.rows[0].data).length
      });
      
      // Test fetching it via the API endpoint logic
      console.log('\n🔍 Testing API fetch logic...');
      const apiQuery = `SELECT * FROM reports WHERE report_id = $1`;
      const apiResult = await pool.query(apiQuery, [newReportId]);
      
      if (apiResult.rows.length > 0) {
        console.log('✅ API fetch simulation successful');
        
        // Parse the data like the API does
        const report = apiResult.rows[0];
        let reportData;
        try {
          if (typeof report.data === 'string') {
            reportData = JSON.parse(report.data);
          } else if (typeof report.data === 'object' && report.data !== null) {
            reportData = report.data;
          } else {
            reportData = {};
          }
          console.log('✅ Data parsing successful');
          console.log('Parsed data keys:', Object.keys(reportData));
        } catch (parseError) {
          console.error('❌ Data parsing failed:', parseError);
        }
      } else {
        console.error('❌ API fetch simulation failed');
      }
      
    } else {
      console.error('❌ Test report verification failed');
    }
    
  } catch (error) {
    console.error('❌ Test report creation failed:', error);
  } finally {
    await pool.end();
  }
}

testReportCreation();
