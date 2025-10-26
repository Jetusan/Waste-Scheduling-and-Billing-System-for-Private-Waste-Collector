const pool = require('../config/dbAdmin');

// Clean up test subscription data for re-testing
class TestDataCleaner {
  constructor() {
    this.userId = null;
  }

  async findUserByUsername(username) {
    try {
      const query = 'SELECT user_id, username, email FROM users WHERE username = $1';
      const result = await pool.query(query, [username]);
      
      if (result.rows.length === 0) {
        console.log(`❌ User '${username}' not found`);
        return null;
      }
      
      const user = result.rows[0];
      console.log(`✅ Found user: ${user.username} (ID: ${user.user_id}, Email: ${user.email})`);
      return user.user_id;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  async cleanupUserSubscriptionData(userId) {
    try {
      console.log(`🧹 Cleaning up subscription data for user ID: ${userId}`);
      
      // Step 1: Delete receipts
      const receiptsResult = await pool.query('DELETE FROM receipts WHERE user_id = $1', [userId]);
      console.log(`✅ Deleted ${receiptsResult.rowCount} receipts`);
      
      // Step 2: Delete payments
      const paymentsResult = await pool.query(`
        DELETE FROM payments 
        WHERE invoice_id IN (
          SELECT invoice_id FROM invoices 
          WHERE subscription_id IN (
            SELECT subscription_id FROM customer_subscriptions 
            WHERE user_id = $1
          )
        )
      `, [userId]);
      console.log(`✅ Deleted ${paymentsResult.rowCount} payments`);
      
      // Step 3: Delete GCash payment records (including receipt images)
      const gcashResult = await pool.query('DELETE FROM gcash_qr_payments WHERE user_id = $1', [userId]);
      console.log(`✅ Deleted ${gcashResult.rowCount} GCash payment records (including receipt images)`);
      
      // Step 4: Reset invoice status
      const invoicesResult = await pool.query(`
        UPDATE invoices 
        SET status = 'unpaid', updated_at = NOW()
        WHERE subscription_id IN (
          SELECT subscription_id FROM customer_subscriptions 
          WHERE user_id = $1
        )
      `, [userId]);
      console.log(`✅ Reset ${invoicesResult.rowCount} invoices to unpaid`);
      
      // Step 5: Reset subscription status
      const subscriptionsResult = await pool.query(`
        UPDATE customer_subscriptions 
        SET 
          status = 'pending_payment',
          payment_status = 'pending',
          payment_confirmed_at = NULL,
          updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);
      console.log(`✅ Reset ${subscriptionsResult.rowCount} subscriptions to pending`);
      
      console.log('\n🎉 Cleanup completed successfully!');
      
      // Show current status
      await this.showCurrentStatus(userId);
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  async showCurrentStatus(userId) {
    try {
      console.log('\n📊 Current Status After Cleanup:');
      console.log('='.repeat(50));
      
      // Count records
      const counts = await pool.query(`
        SELECT 'Receipts' as table_name, COUNT(*) as count FROM receipts WHERE user_id = $1
        UNION ALL
        SELECT 'GCash Payments', COUNT(*) FROM gcash_qr_payments WHERE user_id = $1
        UNION ALL
        SELECT 'Active Subscriptions', COUNT(*) FROM customer_subscriptions WHERE user_id = $1 AND status = 'active'
        UNION ALL
        SELECT 'Pending Subscriptions', COUNT(*) FROM customer_subscriptions WHERE user_id = $1 AND status = 'pending_payment'
      `, [userId]);
      
      counts.rows.forEach(row => {
        console.log(`${row.table_name}: ${row.count}`);
      });
      
      // Show subscription details
      const subscriptions = await pool.query(`
        SELECT 
          cs.subscription_id,
          cs.status as subscription_status,
          cs.payment_status,
          cs.payment_method,
          cs.payment_confirmed_at,
          i.status as invoice_status,
          i.amount
        FROM customer_subscriptions cs
        LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id
        WHERE cs.user_id = $1
        ORDER BY cs.created_at DESC
      `, [userId]);
      
      if (subscriptions.rows.length > 0) {
        console.log('\n📋 Subscription Details:');
        subscriptions.rows.forEach(sub => {
          console.log(`  Subscription ${sub.subscription_id}:`);
          console.log(`    Status: ${sub.subscription_status}`);
          console.log(`    Payment Status: ${sub.payment_status}`);
          console.log(`    Payment Method: ${sub.payment_method}`);
          console.log(`    Invoice Status: ${sub.invoice_status}`);
          console.log(`    Amount: ₱${sub.amount}`);
          console.log('');
        });
      }
      
    } catch (error) {
      console.error('Error showing status:', error);
    }
  }

  async run() {
    console.log('🧹 Test Data Cleanup Tool');
    console.log('='.repeat(30));
    
    // You can change this username to your test user
    const username = process.argv[2] || 'testuser_flow';
    
    if (!username) {
      console.log('❌ Please provide a username');
      console.log('Usage: node cleanup_test_data.js <username>');
      return;
    }
    
    const userId = await this.findUserByUsername(username);
    if (!userId) {
      console.log('\n💡 Available users:');
      const users = await pool.query('SELECT user_id, username, email FROM users ORDER BY created_at DESC LIMIT 10');
      users.rows.forEach(user => {
        console.log(`  ${user.username} (ID: ${user.user_id}) - ${user.email}`);
      });
      return;
    }
    
    await this.cleanupUserSubscriptionData(userId);
    
    console.log('\n🚀 Ready to test subscription flow again!');
    console.log('💡 Your subscription is now reset to pending_payment status');
    console.log('📱 You can now test the GCash upload flow from the beginning');
  }
}

// Run cleanup
async function runCleanup() {
  try {
    const cleaner = new TestDataCleaner();
    await cleaner.run();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runCleanup();
}

module.exports = { TestDataCleaner };
