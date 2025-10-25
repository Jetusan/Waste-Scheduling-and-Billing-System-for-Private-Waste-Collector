const pool = require('./config/dbAdmin');

async function checkSanIsidro() {
  console.log('🔍 Checking for San Isidro barangay...\n');
  
  try {
    // Check if San Isidro exists
    const sanIsidroCheck = await pool.queryWithRetry(`
      SELECT barangay_id, barangay_name 
      FROM barangays 
      WHERE barangay_name ILIKE '%san isidro%'
    `);
    
    if (sanIsidroCheck.rows.length > 0) {
      console.log('✅ San Isidro found:');
      sanIsidroCheck.rows.forEach(b => {
        console.log(`   ID: ${b.barangay_id}, Name: ${b.barangay_name}`);
      });
    } else {
      console.log('❌ San Isidro not found');
      console.log('📝 Adding San Isidro barangay...');
      
      const insertResult = await pool.queryWithRetry(`
        INSERT INTO barangays (barangay_name) 
        VALUES ('San Isidro') 
        RETURNING *
      `);
      
      console.log('✅ San Isidro added:', insertResult.rows[0]);
    }
    
    // Show all barangays
    console.log('\n📋 All barangays:');
    const allBarangays = await pool.queryWithRetry(`
      SELECT barangay_id, barangay_name 
      FROM barangays 
      ORDER BY barangay_id
    `);
    
    allBarangays.rows.forEach(b => {
      console.log(`   ID: ${b.barangay_id}, Name: ${b.barangay_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run check
checkSanIsidro();
