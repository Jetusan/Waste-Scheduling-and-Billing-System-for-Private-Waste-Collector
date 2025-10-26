const { Pool } = require('pg');

// Use the Neon database credentials
const pool = new Pool({
  host: 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupSubdivisionsSimple() {
  try {
    console.log('🔍 Setting up subdivisions table for San Isidro VSM Heights Phase 1...');
    
    // Set search path for Neon compatibility
    await pool.query('SET search_path TO public');
    
    // Step 1: Create subdivisions table
    console.log('📝 Step 1: Creating subdivisions table...');
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS subdivisions (
          subdivision_id SERIAL PRIMARY KEY,
          subdivision_name VARCHAR(200) NOT NULL,
          barangay_id INTEGER REFERENCES barangays(barangay_id),
          description TEXT,
          website VARCHAR(200),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Subdivisions table created successfully');
    } catch (error) {
      console.log('ℹ️ Subdivisions table may already exist:', error.message);
    }
    
    // Step 2: Insert VSM Heights Phase 1
    console.log('📝 Step 2: Inserting VSM Heights Phase 1 subdivision...');
    try {
      const insertResult = await pool.query(`
        INSERT INTO subdivisions (subdivision_name, barangay_id, description, status)
        SELECT 'VSM Heights Phase 1', 6, 'VSM Heights Phase 1 subdivision in San Isidro', 'active'
        WHERE NOT EXISTS (
          SELECT 1 FROM subdivisions 
          WHERE subdivision_name = 'VSM Heights Phase 1' 
          AND barangay_id = 6
        )
        RETURNING subdivision_id, subdivision_name
      `);
      
      if (insertResult.rows.length > 0) {
        console.log('✅ VSM Heights Phase 1 subdivision created:', insertResult.rows[0]);
      } else {
        console.log('ℹ️ VSM Heights Phase 1 subdivision already exists');
      }
    } catch (error) {
      console.log('❌ Error inserting subdivision:', error.message);
    }
    
    // Step 3: Check if subdivision_id column exists in addresses
    console.log('📝 Step 3: Checking addresses table structure...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      AND column_name = 'subdivision_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('📝 Adding subdivision_id column to addresses table...');
      try {
        await pool.query(`
          ALTER TABLE addresses 
          ADD COLUMN subdivision_id INTEGER REFERENCES subdivisions(subdivision_id)
        `);
        console.log('✅ subdivision_id column added to addresses table');
      } catch (error) {
        console.log('❌ Error adding subdivision_id column:', error.message);
      }
    } else {
      console.log('ℹ️ subdivision_id column already exists in addresses table');
    }
    
    // Step 4: Update existing addresses in San Isidro
    console.log('📝 Step 4: Updating existing San Isidro addresses...');
    try {
      const updateResult = await pool.query(`
        UPDATE addresses 
        SET subdivision_id = (
          SELECT subdivision_id 
          FROM subdivisions 
          WHERE subdivision_name = 'VSM Heights Phase 1' 
          AND barangay_id = 6
        )
        WHERE barangay_id = 6 
          AND (
            LOWER(subdivision) LIKE '%vsm%' 
            OR subdivision = 'VSM Heights Phase 1'
            OR subdivision IS NULL
          )
      `);
      console.log(`✅ Updated ${updateResult.rowCount} addresses in San Isidro`);
    } catch (error) {
      console.log('❌ Error updating addresses:', error.message);
    }
    
    // Step 5: Create indexes
    console.log('📝 Step 5: Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_subdivisions_barangay_id ON subdivisions(barangay_id)',
      'CREATE INDEX IF NOT EXISTS idx_subdivisions_name ON subdivisions(subdivision_name)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await pool.query(indexSQL);
      } catch (error) {
        console.log('ℹ️ Index may already exist:', error.message);
      }
    }
    console.log('✅ Indexes created');
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
    const subdivisionCheck = await pool.query(`
      SELECT 
        s.subdivision_id,
        s.subdivision_name,
        b.barangay_name,
        s.description,
        s.status
      FROM subdivisions s
      LEFT JOIN barangays b ON s.barangay_id = b.barangay_id
      WHERE s.subdivision_name = 'VSM Heights Phase 1'
    `);
    
    if (subdivisionCheck.rows.length > 0) {
      const row = subdivisionCheck.rows[0];
      console.log('✅ VSM Heights Phase 1 subdivision verified!');
      console.log(`   ID: ${row.subdivision_id}`);
      console.log(`   Name: ${row.subdivision_name}`);
      console.log(`   Barangay: ${row.barangay_name}`);
      console.log(`   Description: ${row.description}`);
      console.log(`   Status: ${row.status}`);
      
      // Check linked addresses
      const addressCount = await pool.query(`
        SELECT COUNT(*) as count
        FROM addresses 
        WHERE subdivision_id = $1
      `, [row.subdivision_id]);
      
      console.log(`   Linked addresses: ${addressCount.rows[0].count}`);
    } else {
      console.log('❌ VSM Heights Phase 1 subdivision was not found');
    }
    
    // Show all subdivisions in San Isidro
    console.log('\n📋 All subdivisions in San Isidro:');
    const allSubdivisions = await pool.query(`
      SELECT 
        s.subdivision_id,
        s.subdivision_name,
        s.status,
        COUNT(a.address_id) as address_count
      FROM subdivisions s
      LEFT JOIN addresses a ON s.subdivision_id = a.subdivision_id
      WHERE s.barangay_id = 6
      GROUP BY s.subdivision_id, s.subdivision_name, s.status
      ORDER BY s.subdivision_name
    `);
    
    allSubdivisions.rows.forEach(sub => {
      console.log(`   📍 ${sub.subdivision_name} (ID: ${sub.subdivision_id}, Status: ${sub.status}, Addresses: ${sub.address_count})`);
    });
    
    console.log('\n🎉 Subdivision setup complete!');
    console.log('💡 You can now use the collector UI to select VSM Heights Phase 1');
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

setupSubdivisionsSimple();
