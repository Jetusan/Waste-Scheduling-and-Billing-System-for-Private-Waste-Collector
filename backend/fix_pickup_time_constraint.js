const { pool } = require('./config/db');

async function fixPickupTimeConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Fixing pickup_time constraint in special_pickup_requests table...');
    
    // Make pickup_time nullable
    await client.query(`
      ALTER TABLE special_pickup_requests 
      ALTER COLUMN pickup_time DROP NOT NULL;
    `);
    
    console.log('✅ pickup_time column is now nullable');
    
    // Update existing records with null pickup_time to have a default time if needed
    const updateResult = await client.query(`
      UPDATE special_pickup_requests 
      SET pickup_time = NULL 
      WHERE pickup_time IS NOT NULL AND pickup_date >= CURRENT_DATE;
    `);
    
    console.log(`📝 Updated ${updateResult.rowCount} recent records to have null pickup_time`);
    
    // Add comment to explain the change
    await client.query(`
      COMMENT ON COLUMN special_pickup_requests.pickup_time IS 
      'Optional pickup time - nullable since new special pickup flow only requires date (Mon/Tue/Sat)';
    `);
    
    console.log('✅ Special pickup time constraint fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing pickup time constraint:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the fix
if (require.main === module) {
  fixPickupTimeConstraint()
    .then(() => {
      console.log('🎉 Pickup time constraint fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Pickup time constraint fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPickupTimeConstraint };
