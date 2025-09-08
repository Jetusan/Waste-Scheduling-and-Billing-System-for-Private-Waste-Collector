// scripts/checkUsersAddresses.js
const { pool } = require('../config/db');

async function checkUsersAddresses() {
  console.log('🔍 Checking users with role_id = 3 and their barangays...\n');

  try {
    // 1️⃣ Show attributes (users + addresses + barangays)
    const attributesQuery = `
      SELECT 
        c.table_name,
        c.column_name, 
        c.data_type, 
        c.character_maximum_length, 
        c.is_nullable, 
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_name IN ('users', 'addresses', 'barangays')
      ORDER BY c.table_name, c.ordinal_position;
    `;

    const attributes = await pool.query(attributesQuery);
    console.log('✅ Users, Addresses & Barangays Table Attributes:\n');
    console.table(attributes.rows);

    // 2️⃣ Get users with role_id = 3 and their barangay name
    const dataQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.role_id,
        b.barangay_name,
        a.city_municipality,
        a.full_address
      FROM users u
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.role_id = 3
      LIMIT 5;
    `;

    const data = await pool.query(dataQuery);

    console.log('\n✅ Sample Data (Users with role_id = 3 and their barangays):\n');
    if (data.rows.length > 0) {
      console.table(data.rows);
    } else {
      console.log('⚠️ No users found with role_id = 3.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersAddresses();
