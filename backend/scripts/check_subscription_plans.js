// scripts/check_subscription_plans.js
const { pool } = require('../config/db');

async function checkSubscriptionPlans() {
  console.log('🔍 Checking subscription_plans table...\n');

  try {
    // 1️⃣ Check table attributes (columns)
    const attributesQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length, 
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_name = 'subscription_plans'
      ORDER BY ordinal_position;
    `;

    const attributes = await pool.query(attributesQuery);

    if (attributes.rows.length > 0) {
      console.log('✅ Subscription Plans Table Attributes:\n');
      console.table(attributes.rows);
    } else {
      console.log('⚠️ No attributes found. Table "subscription_plans" may not exist.');
      await pool.end();
      return;
    }

    // 2️⃣ Check sample data
    const dataQuery = `SELECT * FROM subscription_plans LIMIT 5;`;
    const data = await pool.query(dataQuery);

    console.log('\n✅ Sample Data from subscription_plans:\n');
    if (data.rows.length > 0) {
      console.table(data.rows);
    } else {
      console.log('⚠️ No data found in subscription_plans table.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSubscriptionPlans();