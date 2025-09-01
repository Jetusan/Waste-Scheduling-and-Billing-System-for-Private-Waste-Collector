const { pool } = require('../config/db');

async function addAmountColumn() {
  try {
    console.log('🔧 Adding amount column to invoices table...');
    
    // Add amount column if it doesn't exist
    const addColumnQuery = `
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;
    `;
    
    await pool.query(addColumnQuery);
    console.log('✅ Amount column added successfully');
    
    // Update existing invoices with plan prices (if any exist)
    const updateAmountQuery = `
      UPDATE invoices 
      SET amount = sp.price 
      FROM subscription_plans sp 
      WHERE invoices.plan_id = sp.plan_id AND invoices.amount = 0.00;
    `;
    
    const updateResult = await pool.query(updateAmountQuery);
    console.log(`✅ Updated ${updateResult.rowCount} existing invoices with plan prices`);
    
    console.log('🎉 Invoices table structure fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing invoices table:', error);
  } finally {
    pool.end();
  }
}

addAmountColumn();
