const { pool } = require('../config/db');

async function updateAddressSchema() {
  console.log('🚀 Starting Address Schema Update...');
  console.log('=====================================');
  let wasFullAddressGenerated = false;
  
  try {
    // Start a transaction for all changes
    await pool.query('BEGIN');
    console.log('✅ Transaction started');

        // Step 1: Drop dependent views
    console.log('\n📝 Step 1: Dropping dependent views...');
    try {
      // Using CASCADE to drop dependent objects
      await pool.query('DROP VIEW IF EXISTS user_details CASCADE');
      console.log('   ✓ Dropped view user_details');
      await pool.query('DROP VIEW IF EXISTS address_summary CASCADE');
      console.log('   ✓ Dropped view address_summary');
       await pool.query('DROP VIEW IF EXISTS barangay_stats CASCADE');
      console.log('   ✓ Dropped view barangay_stats');
    } catch (e) {
        console.log(`   ⚠️ Could not drop a view, but continuing: ${e.message}`);
    }
    
    // Step 2: Add new columns that are missing
    console.log('\n📝 Step 2: Adding new columns...');
    
    // Add subdivision column
    await pool.query(`
      ALTER TABLE addresses 
      ADD COLUMN IF NOT EXISTS subdivision VARCHAR(200)
    `);
    console.log('   ✓ Added subdivision column');
    
    // Add province column (optional, default to null for NCR)
    await pool.query(`
      ALTER TABLE addresses 
      ADD COLUMN IF NOT EXISTS province VARCHAR(100)
    `);
    console.log('   ✓ Added province column');
    
    // Step 3: Rename existing columns to match new schema
    console.log('\n📝 Step 3: Renaming columns...');
    
    // Check if old column names exist before renaming
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      AND column_name IN ('street', 'purok', 'city_name', 'postal_code')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Rename street to street_name
    if (existingColumns.includes('street')) {
      await pool.query(`
        ALTER TABLE addresses 
        RENAME COLUMN street TO street_name
      `);
      console.log('   ✓ Renamed street → street_name');
    }
    
    // Rename purok to purok_or_sitio
    if (existingColumns.includes('purok')) {
      await pool.query(`
        ALTER TABLE addresses 
        RENAME COLUMN purok TO purok_or_sitio
      `);
      console.log('   ✓ Renamed purok → purok_or_sitio');
    }
    
    // Rename city_name to city_municipality
    if (existingColumns.includes('city_name')) {
      await pool.query(`
        ALTER TABLE addresses 
        RENAME COLUMN city_name TO city_municipality
      `);
      console.log('   ✓ Renamed city_name → city_municipality');
    }
    
    // Rename postal_code to zip_code
    if (existingColumns.includes('postal_code')) {
      await pool.query(`
        ALTER TABLE addresses 
        RENAME COLUMN postal_code TO zip_code
      `);
      console.log('   ✓ Renamed postal_code → zip_code');
    }
    
    // Step 4: Drop the old full_address column if it exists
    console.log('\n📝 Step 4: Handling full_address column...');
    
    const fullAddressCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'addresses' AND column_name = 'full_address'
    `);
    
    if (fullAddressCheck.rows.length > 0) {
      await pool.query('ALTER TABLE addresses DROP COLUMN full_address');
      console.log('   ✓ Dropped full_address column');
    }

    // Step 5: Update column constraints and defaults to match requirements
    console.log('\n📝 Step 5: Updating column constraints...');
    
    // Update zip_code to be 4 characters (instead of 10) for Philippine postal codes
    await pool.query(`
      ALTER TABLE addresses 
      ALTER COLUMN zip_code TYPE VARCHAR(4)
    `);
    console.log('   ✓ Updated zip_code to VARCHAR(4) for Philippine postal codes');
    
    // Step 6: Re-add full_address as a regular TEXT column
    console.log('\n📝 Step 6: Recreating full_address column...');
    await pool.query(`
      ALTER TABLE addresses
      ADD COLUMN full_address TEXT
    `);
    console.log('   ✓ Re-added full_address as a regular TEXT column');

    // Step 7: Populate the new full_address column
    console.log('\n📝 Step 7: Populating full_address column...');
    await pool.query(`
      UPDATE addresses
      SET full_address = CONCAT_WS(', ',
        NULLIF(TRIM(CONCAT_WS(' ', house_number, street_name)), ''),
        NULLIF(subdivision, ''),
        NULLIF(purok_or_sitio, ''),
        barangay_name,
        city_municipality,
        NULLIF(province, ''),
        NULLIF(zip_code, '')
      )
    `);
    console.log('   ✓ Populated full_address for existing rows');

    // Step 8: Create a trigger to keep full_address updated
    console.log('\n📝 Step 8: Creating trigger for full_address...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_full_address()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.full_address := CONCAT_WS(', ',
              NULLIF(TRIM(CONCAT_WS(' ', NEW.house_number, NEW.street_name)), ''),
              NULLIF(NEW.subdivision, ''),
              NULLIF(NEW.purok_or_sitio, ''),
              NEW.barangay_name,
              NEW.city_municipality,
              NULLIF(NEW.province, ''),
              NULLIF(NEW.zip_code, '')
          );
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Created trigger function');

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_full_address ON addresses;
    `);
    await pool.query(`
      CREATE TRIGGER trigger_update_full_address
      BEFORE INSERT OR UPDATE ON addresses
      FOR EACH ROW EXECUTE FUNCTION update_full_address();
    `);
    console.log('   ✓ Created trigger on addresses table');
    
    // Step 9: Recreate views
    console.log('\n📝 Step 9: Recreating views...');
    await pool.query(`
      CREATE OR REPLACE VIEW user_details AS
      SELECT
          u.user_id,
          u.username,
          un.first_name,
          un.middle_name,
          un.last_name,
          un.first_name || ' ' || un.last_name AS full_name,
          u.contact_number,
          u.email,
          a.house_number,
          a.street_name,
          a.subdivision,
          a.purok_or_sitio,
          a.barangay_name,
          a.city_municipality,
          a.province,
          a.zip_code,
          a.landmark,
          a.full_address,
          u.role_id,
          u.created_at,
          u.updated_at
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id;
    `);
    console.log('   ✓ Recreated view user_details');

    await pool.query(`
      CREATE OR REPLACE VIEW address_summary AS
      SELECT a.address_id,
        a.street_name,
        a.barangay_name,
        a.city_municipality,
        a.full_address,
        count(u.user_id) AS user_count,
        string_agg(u.username, ', '::text) AS usernames,
        string_agg(un.first_name || ' ' || un.last_name, ', '::text) AS full_names
      FROM addresses a
      LEFT JOIN users u ON a.address_id = u.address_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      GROUP BY a.address_id, a.street_name, a.barangay_name, a.city_municipality, a.full_address;
    `);
    console.log('   ✓ Recreated view address_summary');

    await pool.query(`
      CREATE OR REPLACE VIEW barangay_stats AS
      SELECT a.barangay_name,
        count(DISTINCT a.address_id) AS total_addresses,
        count(DISTINCT u.user_id) AS total_users,
        count(DISTINCT a.street_name) AS unique_streets,
        count(a.address_id) FILTER (WHERE a.landmark IS NOT NULL AND a.landmark::text <> ''::text) AS addresses_with_landmarks,
        count(a.address_id) FILTER (WHERE a.purok_or_sitio IS NOT NULL AND a.purok_or_sitio::text <> ''::text) AS addresses_with_purok,
        string_agg(DISTINCT a.street_name::text, ', '::text) AS streets
      FROM addresses a
      LEFT JOIN users u ON a.address_id = u.address_id
      GROUP BY a.barangay_name;
    `);
    console.log('   ✓ Recreated view barangay_stats');

    // Commit all changes
    await pool.query('COMMIT');
    console.log('\n✅ All changes committed successfully!');
    
    // Step 10: Display the updated schema
    console.log('\n📊 Updated Address Schema:');
    console.log('═'.repeat(50));
    
    const updatedSchema = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'addresses'
      ORDER BY ordinal_position
    `);
    
    updatedSchema.rows.forEach((col, index) => {
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT: ${col.column_default}` : '';
      
      console.log(`   ${index + 1}. ${col.column_name}`);
      console.log(`      Type: ${col.data_type}${maxLength}`);
      console.log(`      Nullable: ${nullable}${defaultValue}`);
      console.log('');
    });
    
    // Show final mapping
    console.log('\n🔄 Field Mapping Summary:');
    console.log('═'.repeat(40));
    console.log('✓ house_number     → house_number (unchanged)');
    console.log('✓ street          → street_name');
    console.log('✓ [NEW]           → subdivision');
    console.log('✓ purok           → purok_or_sitio');
    console.log('✓ barangay_name   → barangay_name (unchanged)');
    console.log('✓ city_name       → city_municipality');
    console.log('✓ [NEW]           → province');
    console.log('✓ postal_code     → zip_code (4 digits)');
    console.log('✓ full_address    → full_address (updated via trigger)');
    console.log('✓ address_type    → address_type (unchanged)');
    
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('❌ Error updating schema:', error.message);
    console.log('🔄 All changes have been rolled back.');
    throw error;
  } finally {
    console.log('\n🔚 Schema update completed.');
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  updateAddressSchema()
    .then(() => {
      console.log('✅ Address schema update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Schema update failed:', error.message);
      process.exit(1);
    });
}

module.exports = { updateAddressSchema };
