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

async function addMondayTestSubdivision() {
  try {
    console.log('🧪 Adding Monday test subdivision for San Isidro...');
    
    // Set search path for Neon compatibility
    await pool.query('SET search_path TO public');
    
    // 1. Check if test subdivision already exists
    const existingTest = await pool.query(`
      SELECT subdivision_id, subdivision_name 
      FROM subdivisions 
      WHERE subdivision_name = 'Monday Test Area'
    `);
    
    if (existingTest.rows.length > 0) {
      console.log('✅ Monday Test Area already exists:', existingTest.rows[0]);
      return;
    }
    
    // 2. Get San Isidro barangay_id
    const sanIsidroResult = await pool.query(`
      SELECT barangay_id, barangay_name 
      FROM barangays 
      WHERE barangay_name = 'San Isidro'
    `);
    
    if (sanIsidroResult.rows.length === 0) {
      console.log('❌ San Isidro barangay not found');
      return;
    }
    
    const sanIsidroId = sanIsidroResult.rows[0].barangay_id;
    console.log(`📍 Found San Isidro: barangay_id ${sanIsidroId}`);
    
    // 3. Create Monday Test Area subdivision
    const createSubdivision = await pool.query(`
      INSERT INTO subdivisions (
        subdivision_name, 
        barangay_id, 
        description, 
        status, 
        created_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING subdivision_id, subdivision_name
    `, [
      'Monday Test Area',
      sanIsidroId,
      'Test subdivision for Monday collection output demonstration',
      'active'
    ]);
    
    const testSubdivisionId = createSubdivision.rows[0].subdivision_id;
    console.log('✅ Created Monday Test Area:', createSubdivision.rows[0]);
    
    // 4. Create some dummy addresses for Monday testing
    console.log('🏠 Creating test addresses...');
    
    const testAddresses = [
      { street: 'Test Street 1', block: '1', lot: '1' },
      { street: 'Test Street 2', block: '1', lot: '2' },
      { street: 'Test Street 3', block: '2', lot: '1' }
    ];
    
    for (let i = 0; i < testAddresses.length; i++) {
      const addr = testAddresses[i];
      
      // Create address
      const addressResult = await pool.query(`
        INSERT INTO addresses (
          street, 
          barangay_id, 
          subdivision_id,
          block,
          lot,
          city_municipality, 
          address_type, 
          full_address
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING address_id
      `, [
        addr.street,
        sanIsidroId,
        testSubdivisionId,
        addr.block,
        addr.lot,
        'Butuan City',
        'residential',
        `${addr.street}, Block ${addr.block}, Lot ${addr.lot}, Monday Test Area, San Isidro, Butuan City`
      ]);
      
      const addressId = addressResult.rows[0].address_id;
      
      // Create test user name
      const nameResult = await pool.query(`
        INSERT INTO user_names (first_name, last_name)
        VALUES ($1, $2)
        RETURNING name_id
      `, [`Test${i + 1}`, 'Resident']);
      
      const nameId = nameResult.rows[0].name_id;
      
      // Create test user
      const userResult = await pool.query(`
        INSERT INTO users (
          username, 
          password_hash, 
          contact_number, 
          role_id, 
          address_id, 
          name_id, 
          approval_status
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id
      `, [
        `test_monday_${i + 1}`,
        '$2b$12$dummy.hash.for.testing.purposes.only',
        `09123456${100 + i}`,
        3, // resident role
        addressId,
        nameId,
        'approved'
      ]);
      
      const userId = userResult.rows[0].user_id;
      
      // Create test subscription
      await pool.query(`
        INSERT INTO customer_subscriptions (
          user_id, 
          plan_id, 
          status, 
          billing_start_date,
          created_at
        ) 
        VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_TIMESTAMP)
      `, [
        userId,
        1, // assuming plan_id 1 exists
        'active'
      ]);
      
      console.log(`   ✅ Created test resident ${i + 1}: Block ${addr.block}, Lot ${addr.lot}`);
    }
    
    // 5. Verify the setup
    console.log('\n🔍 VERIFICATION:');
    
    const verifyQuery = await pool.query(`
      SELECT 
        u.user_id,
        CONCAT(un.first_name, ' ', un.last_name) as name,
        a.street,
        a.block,
        a.lot,
        s.subdivision_name,
        cs.status as subscription_status
      FROM users u
      JOIN user_names un ON u.name_id = un.name_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN subdivisions s ON a.subdivision_id = s.subdivision_id
      JOIN customer_subscriptions cs ON u.user_id = cs.user_id
      WHERE s.subdivision_name = 'Monday Test Area'
      ORDER BY a.block, a.lot
    `);
    
    console.log(`📊 Created ${verifyQuery.rows.length} test residents in Monday Test Area:`);
    verifyQuery.rows.forEach(resident => {
      console.log(`   - ${resident.name}: Block ${resident.block}, Lot ${resident.lot} (${resident.subscription_status})`);
    });
    
    console.log('\n🎯 USAGE:');
    console.log('- Monday Test Area will show residents on ANY day (for testing)');
    console.log('- VSM Heights Phase 1 will only show residents on Wed, Thu, Fri');
    console.log('- Use Monday Test Area to demonstrate collection output on Monday');
    
  } catch (error) {
    console.error('❌ Error adding Monday test subdivision:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

addMondayTestSubdivision();
