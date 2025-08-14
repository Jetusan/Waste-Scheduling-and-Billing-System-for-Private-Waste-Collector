const { pool } = require('../config/db');

async function migrateAddressesBarangayFK_Safe() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting SAFE migration: Add barangay_id FK to addresses table (keeping barangay_name as backup)');
    console.log('═'.repeat(80));
    
    await client.query('BEGIN');
    
    // Step 1: Check if barangay_id column already exists
    console.log('📋 Step 1: Checking if barangay_id column already exists...');
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' AND column_name = 'barangay_id'
    `;
    const columnExists = await client.query(checkColumnQuery);
    
    if (columnExists.rows.length === 0) {
      // Step 2: Add barangay_id column to addresses table
      console.log('➕ Step 2: Adding barangay_id column to addresses table...');
      await client.query(`
        ALTER TABLE addresses 
        ADD COLUMN barangay_id INTEGER
      `);
      console.log('✅ barangay_id column added successfully');
    } else {
      console.log('ℹ️  barangay_id column already exists, skipping creation');
    }
    
    // Step 3: Populate barangay_id based on existing barangay_name
    console.log('🔄 Step 3: Populating barangay_id based on existing barangay_name...');
    const updateQuery = `
      UPDATE addresses 
      SET barangay_id = b.barangay_id 
      FROM barangays b 
      WHERE addresses.barangay_name = b.barangay_name
        AND addresses.barangay_id IS NULL
    `;
    const updateResult = await client.query(updateQuery);
    console.log(`✅ Updated ${updateResult.rowCount} records with barangay_id`);
    
    // Step 4: Check for any addresses that couldn't be matched
    console.log('🔍 Step 4: Checking for unmatched addresses...');
    const unmatchedQuery = `
      SELECT address_id, barangay_name 
      FROM addresses 
      WHERE barangay_id IS NULL
    `;
    const unmatchedResult = await client.query(unmatchedQuery);
    
    if (unmatchedResult.rows.length > 0) {
      console.log(`⚠️  Warning: Found ${unmatchedResult.rows.length} addresses that couldn't be matched:`);
      unmatchedResult.rows.forEach(row => {
        console.log(`   - Address ID ${row.address_id}: "${row.barangay_name}"`);
      });
      
      console.log('🔧 Creating missing barangays and updating addresses...');
      
      for (const row of unmatchedResult.rows) {
        // Insert missing barangay (assuming city_id = 1 for General Santos City)
        const insertBarangayQuery = `
          INSERT INTO barangays (barangay_name, city_id) 
          VALUES ($1, 1) 
          ON CONFLICT (barangay_name, city_id) DO NOTHING
          RETURNING barangay_id
        `;
        const barangayResult = await client.query(insertBarangayQuery, [row.barangay_name]);
        
        let barangayId;
        if (barangayResult.rows.length > 0) {
          barangayId = barangayResult.rows[0].barangay_id;
        } else {
          const findBarangayQuery = `
            SELECT barangay_id FROM barangays 
            WHERE barangay_name = $1 AND city_id = 1
          `;
          const findResult = await client.query(findBarangayQuery, [row.barangay_name]);
          barangayId = findResult.rows[0].barangay_id;
        }
        
        await client.query(
          'UPDATE addresses SET barangay_id = $1 WHERE address_id = $2',
          [barangayId, row.address_id]
        );
      }
      
      console.log('✅ Missing barangays created and addresses updated');
    } else {
      console.log('✅ All addresses successfully matched with existing barangays');
    }
    
    // Step 5: Make barangay_id NOT NULL
    console.log('🔒 Step 5: Making barangay_id column NOT NULL...');
    await client.query(`
      ALTER TABLE addresses 
      ALTER COLUMN barangay_id SET NOT NULL
    `);
    console.log('✅ barangay_id column set to NOT NULL');
    
    // Step 6: Add foreign key constraint
    console.log('🔗 Step 6: Adding foreign key constraint...');
    const constraintName = 'fk_addresses_barangay';
    
    const checkConstraintQuery = `
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'addresses' 
        AND constraint_name = $1
        AND constraint_type = 'FOREIGN KEY'
    `;
    const constraintExists = await client.query(checkConstraintQuery, [constraintName]);
    
    if (constraintExists.rows.length === 0) {
      await client.query(`
        ALTER TABLE addresses 
        ADD CONSTRAINT ${constraintName} 
        FOREIGN KEY (barangay_id) 
        REFERENCES barangays(barangay_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
      `);
      console.log('✅ Foreign key constraint added successfully');
    } else {
      console.log('ℹ️  Foreign key constraint already exists');
    }
    
    // Step 7: Rename barangay_name to barangay_name_backup (keeping as backup)
    console.log('🔄 Step 7: Renaming barangay_name to barangay_name_backup...');
    const checkBackupColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' AND column_name = 'barangay_name_backup'
    `;
    const backupExists = await client.query(checkBackupColumnQuery);
    
    if (backupExists.rows.length === 0) {
      await client.query(`
        ALTER TABLE addresses 
        RENAME COLUMN barangay_name TO barangay_name_backup
      `);
      console.log('✅ barangay_name column renamed to barangay_name_backup');
    } else {
      console.log('ℹ️  barangay_name_backup column already exists');
    }
    
    // Step 8: Verify the final structure
    console.log('🔍 Step 8: Verifying final table structure...');
    const finalStructureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'addresses'
      ORDER BY ordinal_position
    `;
    const finalResult = await client.query(finalStructureQuery);
    
    console.log('📊 Final addresses table structure:');
    console.log('─'.repeat(50));
    finalResult.rows.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT: ${col.column_default}` : '';
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${nullable}${defaultValue}`);
    });
    
    await client.query('COMMIT');
    console.log('');
    console.log('🎉 SAFE Migration completed successfully!');
    console.log('✅ addresses.barangay_id (FK) added and populated');
    console.log('✅ Foreign key constraint added between addresses and barangays');
    console.log('✅ Original barangay_name column preserved as barangay_name_backup');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Update your application code to use barangay_id instead of barangay_name');
    console.log('   2. Test thoroughly');
    console.log('   3. Once confident, you can drop barangay_name_backup column');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the safe migration
console.log('🚀 Starting SAFE addresses barangay FK migration...');
migrateAddressesBarangayFK_Safe()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  });
