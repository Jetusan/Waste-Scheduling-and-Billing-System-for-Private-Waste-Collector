const { pool } = require('../config/db');

async function fixInvoiceUserIds() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 FIXING INVOICE USER_ID LINKAGE');
    console.log('==================================');
    
    // Update invoices to include user_id from customer_subscriptions
    const updateResult = await client.query(`
      UPDATE invoices 
      SET user_id = cs.user_id 
      FROM customer_subscriptions cs 
      WHERE invoices.subscription_id = cs.subscription_id 
        AND invoices.user_id IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} invoices with user_id`);
    
    // Verify the fix
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM invoices 
      WHERE user_id IS NOT NULL
    `);
    
    console.log(`✅ Total invoices with user_id: ${verifyResult.rows[0].count}`);
    
    // Check how many users should now appear in billing
    const billingUsersResult = await client.query(`
      WITH invoice_stats AS (
        SELECT 
          user_id,
          COUNT(*) AS total_invoices,
          COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) AS outstanding_balance
        FROM invoices
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN invoice_stats inv ON inv.user_id = u.user_id
      WHERE u.role_id = 3
        AND u.approval_status = 'approved'
        AND b.barangay_name = 'San Isidro'
        AND COALESCE(inv.total_invoices, 0) > 0
    `);
    
    console.log(`✅ Users from San Isidro that should appear in billing: ${billingUsersResult.rows[0].count}`);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 INVOICE USER_ID LINKAGE FIXED!');
    console.log('Now your billing page should show all the VSM Heights users.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing invoice user_ids:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the fix
if (require.main === module) {
  fixInvoiceUserIds()
    .then(() => {
      console.log('✅ Invoice fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Invoice fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixInvoiceUserIds };
