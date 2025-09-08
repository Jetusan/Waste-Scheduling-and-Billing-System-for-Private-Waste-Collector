// checkCustomerSubscriptionsData.js
const { pool } = require('../config/db');

async function checkCustomerSubscriptionsData() {
  console.log('🔍 Fetching data from customer_subscriptions table...\n');

  try {
    const query = `
      SELECT * 
      FROM customer_subscriptions
      LIMIT 20; -- limit to avoid huge dumps
    `;

    const result = await pool.query(query);

    if (result.rows.length > 0) {
      console.log('✅ Customer Subscriptions Table Data:\n');
      console.table(result.rows);
    } else {
      console.log('⚠️ No data found in "customer_subscriptions".');
    }

  } catch (error) {
    console.error('❌ Error fetching customer_subscriptions data:', error.message);
  } finally {
    await pool.end();
  }
}

checkCustomerSubscriptionsData();
