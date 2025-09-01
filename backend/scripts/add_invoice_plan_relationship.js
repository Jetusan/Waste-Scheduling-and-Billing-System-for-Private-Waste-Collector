// Add plan_id foreign key to invoices table
const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function addInvoicePlanRelationship() {
  console.log('🔄 Adding plan_id foreign key to invoices table...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read and execute the migration
    const migrationPath = path.join(__dirname, '../migrations/add_plan_id_to_invoices.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('1️⃣ Executing migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    console.log('\n2️⃣ Verifying invoices table structure...');
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position;
    `;
    const structure = await client.query(structureQuery);
    console.table(structure.rows);
    
    // Check foreign key constraint
    console.log('\n3️⃣ Verifying foreign key constraint...');
    const fkQuery = `
      SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'invoices'
          AND kcu.column_name = 'plan_id';
    `;
    const fkResult = await client.query(fkQuery);
    
    if (fkResult.rows.length > 0) {
      console.log('✅ Foreign key constraint created:');
      console.table(fkResult.rows);
    } else {
      console.log('❌ No foreign key constraint found');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding plan_id to invoices:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addInvoicePlanRelationship().catch(console.error);
