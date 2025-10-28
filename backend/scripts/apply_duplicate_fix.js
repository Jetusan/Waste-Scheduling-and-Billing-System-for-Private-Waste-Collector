const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixDuplicateInvoices() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting duplicate invoice analysis and fix...');
    
    // 1. Check for existing duplicates
    console.log('\n1️⃣ Checking for duplicate invoices...');
    const duplicateCheck = await client.query(`
      SELECT 
          user_id,
          subscription_id,
          DATE(created_at) as invoice_date,
          COUNT(*) as duplicate_count,
          STRING_AGG(invoice_number, ', ') as invoice_numbers,
          STRING_AGG(invoice_id::text, ', ') as invoice_ids
      FROM invoices 
      WHERE status = 'unpaid'
      GROUP BY user_id, subscription_id, DATE(created_at)
      HAVING COUNT(*) > 1
      ORDER BY user_id, invoice_date
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log(`❌ Found ${duplicateCheck.rows.length} sets of duplicate invoices:`);
      duplicateCheck.rows.forEach(row => {
        console.log(`   User ${row.user_id}: ${row.duplicate_count} invoices on ${row.invoice_date}`);
        console.log(`   Invoice Numbers: ${row.invoice_numbers}`);
      });
      
      // 2. Remove duplicates (keep only the first one)
      console.log('\n2️⃣ Removing duplicate invoices (keeping the first one)...');
      const deleteResult = await client.query(`
        WITH duplicate_invoices AS (
            SELECT 
                invoice_id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id, subscription_id, DATE(created_at) 
                    ORDER BY created_at ASC
                ) as row_num
            FROM invoices 
            WHERE status = 'unpaid'
        )
        DELETE FROM invoices 
        WHERE invoice_id IN (
            SELECT invoice_id 
            FROM duplicate_invoices 
            WHERE row_num > 1
        )
      `);
      
      console.log(`✅ Removed ${deleteResult.rowCount} duplicate invoices`);
    } else {
      console.log('✅ No duplicate invoices found');
    }
    
    // 3. Add unique constraint to prevent future duplicates
    console.log('\n3️⃣ Adding unique constraint to prevent future duplicates...');
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_daily_subscription_invoice 
        ON invoices (user_id, subscription_id, DATE(created_at)) 
        WHERE status = 'unpaid'
      `);
      console.log('✅ Unique constraint added successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Unique constraint already exists');
      } else {
        console.error('❌ Error adding unique constraint:', error.message);
      }
    }
    
    // 4. Update invoice descriptions
    console.log('\n4️⃣ Updating invoice descriptions...');
    const updateResult = await client.query(`
      UPDATE invoices 
      SET description = CASE 
          WHEN amount > 1500 THEN 'Special Pickup Service'
          WHEN amount < 500 THEN 'Late Payment Fee'
          ELSE 'Monthly Subscription Fee'
      END
      WHERE description IS NULL OR description = ''
    `);
    console.log(`✅ Updated ${updateResult.rowCount} invoice descriptions`);
    
    // 5. Check for orphaned invoices
    console.log('\n5️⃣ Checking for orphaned invoices...');
    const orphanCheck = await client.query(`
      SELECT 
          i.invoice_id,
          i.invoice_number,
          i.user_id,
          i.subscription_id,
          i.amount,
          i.created_at,
          cs.status as subscription_status
      FROM invoices i
      LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      WHERE cs.subscription_id IS NULL
      ORDER BY i.created_at DESC
    `);
    
    if (orphanCheck.rows.length > 0) {
      console.log(`⚠️ Found ${orphanCheck.rows.length} orphaned invoices (invoices without valid subscriptions)`);
      orphanCheck.rows.forEach(row => {
        console.log(`   Invoice ${row.invoice_number}: User ${row.user_id}, Amount ₱${row.amount}`);
      });
    } else {
      console.log('✅ No orphaned invoices found');
    }
    
    // 6. Final summary
    console.log('\n6️⃣ Final invoice status summary:');
    const summary = await client.query(`
      SELECT 
          status,
          COUNT(*) as count,
          SUM(amount) as total_amount
      FROM invoices 
      GROUP BY status
      ORDER BY status
    `);
    
    summary.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} invoices, Total: ₱${parseFloat(row.total_amount || 0).toFixed(2)}`);
    });
    
    console.log('\n✅ Duplicate invoice fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing duplicate invoices:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the fix
if (require.main === module) {
  fixDuplicateInvoices()
    .then(() => {
      console.log('\n🎉 All done! Duplicate invoice issues have been resolved.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed to fix duplicate invoices:', error);
      process.exit(1);
    });
}

module.exports = { fixDuplicateInvoices };
