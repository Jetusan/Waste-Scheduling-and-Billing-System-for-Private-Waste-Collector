const { pool } = require('../config/db');

const checkSubscriptionTables = async () => {
  try {
    console.log('🔍 Checking subscription-related tables and their relationships...\n');
    
    // 1. Check customer_subscriptions table structure
    console.log('📋 CUSTOMER_SUBSCRIPTIONS TABLE:');
    const subscriptionsQuery = `
      SELECT 
        subscription_id,
        user_id,
        plan_id,
        status,
        payment_status,
        payment_method,
        billing_start_date,
        payment_confirmed_at,
        created_at
      FROM customer_subscriptions 
      ORDER BY created_at DESC
    `;
    const subscriptions = await pool.query(subscriptionsQuery);
    console.table(subscriptions.rows);
    
    // 2. Check subscription_plans table
    console.log('\n📋 SUBSCRIPTION_PLANS TABLE:');
    const plansQuery = 'SELECT * FROM subscription_plans ORDER BY plan_id';
    const plans = await pool.query(plansQuery);
    console.table(plans.rows);
    
    // 3. Check invoices linked to subscriptions
    console.log('\n📋 INVOICES TABLE (with subscription links):');
    const invoicesQuery = `
      SELECT 
        invoice_id,
        invoice_number,
        user_id,
        subscription_id,
        amount,
        status,
        due_date,
        created_at
      FROM invoices 
      WHERE subscription_id IS NOT NULL
      ORDER BY created_at DESC
    `;
    const invoices = await pool.query(invoicesQuery);
    console.table(invoices.rows);
    
    // 4. Check users table for reference
    console.log('\n📋 USERS TABLE (sample):');
    const usersQuery = 'SELECT user_id, username, contact_number FROM users ORDER BY user_id DESC LIMIT 5';
    const users = await pool.query(usersQuery);
    console.table(users.rows);
    
    // 5. Test the subscription status logic
    console.log('\n🧪 TESTING SUBSCRIPTION STATUS LOGIC:');
    
    // Get a sample user with subscription
    const testUserQuery = `
      SELECT DISTINCT user_id FROM customer_subscriptions 
      ORDER BY created_at DESC LIMIT 1
    `;
    const testUserResult = await pool.query(testUserQuery);
    
    if (testUserResult.rows.length > 0) {
      const testUserId = testUserResult.rows[0].user_id;
      console.log(`\n🔍 Testing with user_id: ${testUserId}`);
      
      // Run the same query as our API
      const statusQuery = `
        SELECT 
          cs.*,
          sp.plan_name,
          sp.price,
          sp.frequency,
          sp.description
        FROM customer_subscriptions cs
        JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        WHERE cs.user_id = $1
        ORDER BY cs.created_at DESC
        LIMIT 1
      `;
      
      const statusResult = await pool.query(statusQuery, [testUserId]);
      
      if (statusResult.rows.length > 0) {
        console.log('✅ SUBSCRIPTION FOUND:');
        console.table(statusResult.rows);
        
        // Check for invoice
        const invoiceQuery = `
          SELECT * FROM invoices 
          WHERE subscription_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        const invoiceResult = await pool.query(invoiceQuery, [statusResult.rows[0].subscription_id]);
        
        if (invoiceResult.rows.length > 0) {
          console.log('\n📄 RELATED INVOICE:');
          console.table(invoiceResult.rows);
        } else {
          console.log('\n❌ NO INVOICE FOUND for this subscription');
        }
      } else {
        console.log('❌ NO SUBSCRIPTION FOUND for this user');
      }
    } else {
      console.log('❌ NO USERS WITH SUBSCRIPTIONS FOUND');
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('✅ Tables to check for subscription status:');
    console.log('   1. customer_subscriptions (main table)');
    console.log('   2. subscription_plans (for plan details)');
    console.log('   3. invoices (for payment status)');
    console.log('   4. users (for user info)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkSubscriptionTables();
