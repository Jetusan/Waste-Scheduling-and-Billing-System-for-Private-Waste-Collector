const { pool } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

async function cleanupOldAddressColumns() {
  console.log('🧹 Starting Address Columns Cleanup...');
  console.log('=====================================');
  
  try {
    // Step 1: Create backup before cleanup
    console.log('📦 Step 1: Creating backup...');
    
    const backupDir = path.join(__dirname, '../backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `addresses_pre_cleanup_${timestamp}.json`);
    
    // Ensure backup directory exists
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      // Directory already exists, continue
    }
    
    // Get all addresses data
    const backupData = await pool.query('SELECT * FROM addresses ORDER BY address_id');
    await fs.writeFile(backupFile, JSON.stringify(backupData.rows, null, 2));
    console.log(`   ✓ Backup saved to: ${backupFile}`);
    
    // Step 2: Verify new schema is in place
    console.log('\n🔍 Step 2: Verifying schema...');
    
    const schemaCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      AND column_name IN ('street_name', 'purok_or_sitio', 'city_municipality', 'zip_code', 'subdivision', 'province')
    `);
    
    const newColumns = schemaCheck.rows.map(row => row.column_name);
    const expectedColumns = ['street_name', 'purok_or_sitio', 'city_municipality', 'zip_code', 'subdivision', 'province'];
    const missingColumns = expectedColumns.filter(col => !newColumns.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing new columns: ${missingColumns.join(', ')}. Please run updateAddressSchema.js first.`);
    }
    
    console.log('   ✓ All new columns are present');
    
    // Step 3: Check for any remaining old column references
    console.log('\n🔍 Step 3: Checking for old column references...');
    
    const oldColumnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      AND column_name IN ('street', 'purok', 'city_name', 'postal_code')
    `);
    
    const oldColumns = oldColumnsCheck.rows.map(row => row.column_name);
    
    if (oldColumns.length > 0) {
      console.log(`   ⚠️  Found old columns that might still exist: ${oldColumns.join(', ')}`);
      console.log('   ℹ️  These should have been renamed by updateAddressSchema.js');
    } else {
      console.log('   ✓ No old column names found - schema migration was successful');
    }
    
    // Step 4: Data validation
    console.log('\n✅ Step 4: Validating data integrity...');
    
    // Check for addresses with missing required fields
    const validationResults = await pool.query(`
      SELECT 
        COUNT(*) as total_addresses,
        COUNT(street_name) as has_street_name,
        COUNT(barangay_name) as has_barangay,
        COUNT(city_municipality) as has_city,
        COUNT(full_address) as has_full_address,
        COUNT(CASE WHEN street_name IS NULL OR street_name = '' THEN 1 END) as missing_street,
        COUNT(CASE WHEN barangay_name IS NULL OR barangay_name = '' THEN 1 END) as missing_barangay
      FROM addresses
    `);
    
    const stats = validationResults.rows[0];
    console.log(`   📊 Total addresses: ${stats.total_addresses}`);
    console.log(`   ✓ With street_name: ${stats.has_street_name}`);
    console.log(`   ✓ With barangay: ${stats.has_barangay}`);
    console.log(`   ✓ With city: ${stats.has_city}`);
    console.log(`   ✓ With full_address: ${stats.has_full_address}`);
    
    if (parseInt(stats.missing_street) > 0) {
      console.log(`   ⚠️  ${stats.missing_street} addresses missing street_name`);
    }
    
    if (parseInt(stats.missing_barangay) > 0) {
      console.log(`   ⚠️  ${stats.missing_barangay} addresses missing barangay_name`);
    }
    
    // Step 5: Update any empty full_address fields
    console.log('\n🔄 Step 5: Updating full_address fields...');
    
    const updateResult = await pool.query(`
      UPDATE addresses 
      SET full_address = CONCAT_WS(', ',
        NULLIF(TRIM(CONCAT_WS(' ', house_number, street_name)), ''),
        NULLIF(subdivision, ''),
        NULLIF(purok_or_sitio, ''),
        barangay_name,
        city_municipality,
        NULLIF(province, ''),
        NULLIF(zip_code, '')
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE full_address IS NULL OR full_address = '' OR full_address NOT LIKE '%' || street_name || '%'
    `);
    
    console.log(`   ✓ Updated ${updateResult.rowCount} addresses with new full_address format`);
    
    // Step 6: Show sample addresses with new format
    console.log('\n📋 Step 6: Sample addresses with new format:');
    console.log('─'.repeat(50));
    
    const sampleAddresses = await pool.query(`
      SELECT 
        address_id,
        house_number,
        street_name,
        subdivision,
        purok_or_sitio,
        barangay_name,
        city_municipality,
        province,
        zip_code,
        full_address
      FROM addresses 
      ORDER BY address_id 
      LIMIT 3
    `);
    
    sampleAddresses.rows.forEach((addr, index) => {
      console.log(`${index + 1}. Address ID: ${addr.address_id}`);
      console.log(`   House: ${addr.house_number || 'N/A'}`);
      console.log(`   Street: ${addr.street_name || 'N/A'}`);
      console.log(`   Subdivision: ${addr.subdivision || 'N/A'}`);
      console.log(`   Purok/Sitio: ${addr.purok_or_sitio || 'N/A'}`);
      console.log(`   Barangay: ${addr.barangay_name || 'N/A'}`);
      console.log(`   City: ${addr.city_municipality || 'N/A'}`);
      console.log(`   Province: ${addr.province || 'N/A'}`);
      console.log(`   ZIP: ${addr.zip_code || 'N/A'}`);
      console.log(`   Full: ${addr.full_address || 'N/A'}`);
      console.log('');
    });
    
    console.log('✅ Address columns cleanup completed successfully!');
    console.log('\n🎉 Your addresses table now matches the core address components schema!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  } finally {
    console.log('\n🔚 Cleanup process completed.');
  }
}

// Run the cleanup if this file is executed directly
if (require.main === module) {
  cleanupOldAddressColumns()
    .then(() => {
      console.log('✅ Address cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanupOldAddressColumns };
