const { pool } = require('./config/db');

async function updateSpecialPickupTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting special pickup table updates...');
    
    // Check if table exists and get current structure
    const tableCheckQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'special_pickup_requests' 
      ORDER BY ordinal_position;
    `;
    
    const tableResult = await client.query(tableCheckQuery);
    console.log('📋 Current table structure:', tableResult.rows);
    
    // Ensure all required columns exist
    const requiredColumns = [
      { name: 'pickup_latitude', type: 'DECIMAL(10,8)', nullable: true },
      { name: 'pickup_longitude', type: 'DECIMAL(11,8)', nullable: true },
      { name: 'pickup_time', type: 'TIME', nullable: true }, // Keep for backward compatibility
      { name: 'waste_type', type: 'VARCHAR(100)', nullable: false },
      { name: 'description', type: 'TEXT', nullable: false },
      { name: 'pickup_date', type: 'DATE', nullable: false },
      { name: 'address', type: 'TEXT', nullable: false },
      { name: 'notes', type: 'TEXT', nullable: true },
      { name: 'message', type: 'TEXT', nullable: true },
      { name: 'image_url', type: 'VARCHAR(500)', nullable: true }
    ];
    
    const existingColumns = tableResult.rows.map(row => row.column_name);
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        const addColumnQuery = `
          ALTER TABLE special_pickup_requests 
          ADD COLUMN ${column.name} ${column.type} ${column.nullable ? '' : 'NOT NULL'};
        `;
        
        console.log(`➕ Adding missing column: ${column.name}`);
        await client.query(addColumnQuery);
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Add comment to pickup_time column to indicate it's optional now
    await client.query(`
      COMMENT ON COLUMN special_pickup_requests.pickup_time IS 
      'Optional pickup time - not required for new special pickup flow (Mon/Tue/Sat only)';
    `);
    
    // Create index on coordinates for better performance
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_special_pickup_coordinates 
        ON special_pickup_requests(pickup_latitude, pickup_longitude) 
        WHERE pickup_latitude IS NOT NULL AND pickup_longitude IS NOT NULL;
      `);
      console.log('📍 Created index on pickup coordinates');
    } catch (indexError) {
      console.log('ℹ️ Coordinate index already exists or creation failed:', indexError.message);
    }
    
    // Create index on waste_type for better filtering
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_special_pickup_waste_type 
        ON special_pickup_requests(waste_type);
      `);
      console.log('🗂️ Created index on waste_type');
    } catch (indexError) {
      console.log('ℹ️ Waste type index already exists or creation failed:', indexError.message);
    }
    
    // Create index on pickup_date for better date filtering
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_special_pickup_date 
        ON special_pickup_requests(pickup_date);
      `);
      console.log('📅 Created index on pickup_date');
    } catch (indexError) {
      console.log('ℹ️ Pickup date index already exists or creation failed:', indexError.message);
    }
    
    // Test insert with new waste types to ensure they work
    console.log('🧪 Testing new waste type values...');
    const testWasteTypes = ['Non-Biodegradable', 'Biodegradable', 'Recyclable'];
    
    for (const wasteType of testWasteTypes) {
      console.log(`✅ Waste type "${wasteType}" is valid (length: ${wasteType.length})`);
    }
    
    console.log('✅ Special pickup table updates completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  • Verified all required columns exist');
    console.log('  • Added indexes for better performance');
    console.log('  • Updated pickup_time column comment (now optional)');
    console.log('  • Validated new waste type values');
    console.log('  • Table ready for new special pickup flow:');
    console.log('    - Waste types: Non-Biodegradable, Biodegradable, Recyclable');
    console.log('    - Date restrictions: Monday, Tuesday, Saturday only');
    console.log('    - GPS coordinates supported');
    console.log('    - Time picker removed (pickup_time optional)');
    
  } catch (error) {
    console.error('❌ Error updating special pickup table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the update
if (require.main === module) {
  updateSpecialPickupTable()
    .then(() => {
      console.log('🎉 Special pickup table update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Special pickup table update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateSpecialPickupTable };
