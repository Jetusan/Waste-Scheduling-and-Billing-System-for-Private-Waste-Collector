const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function setupSubdivisions() {
  try {
    console.log('🔍 Setting up subdivisions table for San Isidro VSM Heights Phase 1...');
    
    // Set search path for Neon compatibility
    await pool.query('SET search_path TO public');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'create_subdivisions_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL script...');
    
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          const result = await pool.query(statement);
          
          // If this is the verification query (last one), show results
          if (i === statements.length - 1 && result.rows && result.rows.length > 0) {
            console.log('\n✅ SETUP VERIFICATION:');
            result.rows.forEach(row => {
              console.log(`   📍 ${row.subdivision_name} (ID: ${row.subdivision_id})`);
              console.log(`      Barangay: ${row.barangay_name} (ID: ${row.barangay_id})`);
              console.log(`      Description: ${row.description}`);
              console.log(`      Status: ${row.status}`);
              console.log(`      Addresses linked: ${row.address_count}`);
            });
          }
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with next statement for non-critical errors
        }
      }
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
    const subdivisionCheck = await pool.query(`
      SELECT 
        s.subdivision_id,
        s.subdivision_name,
        b.barangay_name,
        COUNT(a.address_id) as linked_addresses
      FROM subdivisions s
      LEFT JOIN barangays b ON s.barangay_id = b.barangay_id
      LEFT JOIN addresses a ON s.subdivision_id = a.subdivision_id
      WHERE s.subdivision_name = 'VSM Heights Phase 1'
      GROUP BY s.subdivision_id, s.subdivision_name, b.barangay_name
    `);
    
    if (subdivisionCheck.rows.length > 0) {
      const row = subdivisionCheck.rows[0];
      console.log('✅ VSM Heights Phase 1 subdivision created successfully!');
      console.log(`   ID: ${row.subdivision_id}`);
      console.log(`   Name: ${row.subdivision_name}`);
      console.log(`   Barangay: ${row.barangay_name}`);
      console.log(`   Linked addresses: ${row.linked_addresses}`);
    } else {
      console.log('❌ VSM Heights Phase 1 subdivision was not created');
    }
    
    // Check if addresses table has subdivision_id column
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      AND column_name = 'subdivision_id'
    `);
    
    console.log(`🔍 Addresses table has subdivision_id column: ${columnCheck.rows.length > 0 ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🎉 Subdivision setup complete!');
    console.log('💡 You can now run your original subdivision script or use the collector UI');
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

setupSubdivisions();
