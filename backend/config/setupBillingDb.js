const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration - matching your existing db.js
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'waste_collection_db',
  password: 'root', // Updated to match your actual password
  port: 5432,
});

async function setupBillingDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting billing database setup...');
    
    // Read the billing tables SQL file
    const billingTablesPath = path.join(__dirname, 'billing_tables.sql');
    const billingTablesSQL = fs.readFileSync(billingTablesPath, 'utf8');
    
    console.log('📝 Creating billing tables...');
    await client.query(billingTablesSQL);
    
    console.log('✅ Billing database setup completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - subscription_plans');
    console.log('   - customer_subscriptions');
    console.log('   - invoices');
    console.log('   - payments');
    console.log('   - payment_history');
    console.log('   - Default subscription plans inserted');
    console.log('   - Indexes created for performance');
    console.log('   - Triggers created for updated_at timestamps');
    
  } catch (error) {
    console.error('❌ Error setting up billing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupBillingDatabase()
    .then(() => {
      console.log('🎉 Billing database setup finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Billing database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupBillingDatabase }; 