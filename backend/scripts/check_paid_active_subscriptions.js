const { pool } = require('../config/db');

const checkPaidActiveSubscriptions = async () => {
  try {
    console.log('📊 CHECKING PAID AND ACTIVE SUBSCRIPTIONS\n');
    
    // 1. Get all active and paid subscriptions with user details
    console.log('✅ ACTIVE & PAID SUBSCRIPTIONS:');
    console.log('═'.repeat(80));
    
    const activeQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.contact_number,
        u.email,
        cs.subscription_id,
        cs.status as subscription_status,
        cs.payment_status,
        cs.payment_method,
        cs.billing_start_date,
        cs.payment_confirmed_at,
        cs.created_at as subscription_created,
        sp.plan_name,
        sp.price,
        sp.frequency
      FROM customer_subscriptions cs
      JOIN users u ON cs.user_id = u.user_id
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.status = 'active' AND cs.payment_status = 'paid'
      ORDER BY cs.payment_confirmed_at DESC
    `;
    
    const activeResults = await pool.query(activeQuery);
    
    if (activeResults.rows.length === 0) {
      console.log('❌ No active and paid subscriptions found');
    } else {
      console.log(`Found ${activeResults.rows.length} active and paid subscriptions:\n`);
      
      activeResults.rows.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.username}`);
        console.log(`   📱 Contact: ${sub.contact_number || 'N/A'}`);
        console.log(`   📧 Email: ${sub.email || 'N/A'}`);
        console.log(`   💳 Plan: ${sub.plan_name} - ₱${sub.price}/${sub.frequency}`);
        console.log(`   💰 Payment: ${sub.payment_method.toUpperCase()}`);
        console.log(`   ✅ Confirmed: ${new Date(sub.payment_confirmed_at).toLocaleString()}`);
        console.log(`   📅 Started: ${new Date(sub.billing_start_date).toLocaleDateString()}`);
        console.log('   ─'.repeat(50));
      });
    }
    
    // 2. Get pending payment subscriptions
    console.log('\n⏳ PENDING PAYMENT SUBSCRIPTIONS:');
    console.log('═'.repeat(80));
    
    const pendingQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.contact_number,
        u.email,
        cs.subscription_id,
        cs.status as subscription_status,
        cs.payment_status,
        cs.payment_method,
        cs.billing_start_date,
        cs.created_at as subscription_created,
        sp.plan_name,
        sp.price,
        sp.frequency,
        i.invoice_number,
        i.amount as invoice_amount,
        i.due_date,
        i.status as invoice_status
      FROM customer_subscriptions cs
      JOIN users u ON cs.user_id = u.user_id
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id
      WHERE cs.status = 'pending_payment' AND cs.payment_status = 'pending'
      ORDER BY cs.created_at DESC
    `;
    
    const pendingResults = await pool.query(pendingQuery);
    
    if (pendingResults.rows.length === 0) {
      console.log('✅ No pending payment subscriptions found');
    } else {
      console.log(`Found ${pendingResults.rows.length} pending payment subscriptions:\n`);
      
      pendingResults.rows.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.username}`);
        console.log(`   📱 Contact: ${sub.contact_number || 'N/A'}`);
        console.log(`   📧 Email: ${sub.email || 'N/A'}`);
        console.log(`   💳 Plan: ${sub.plan_name} - ₱${sub.price}/${sub.frequency}`);
        console.log(`   💰 Payment Method: ${sub.payment_method.toUpperCase()}`);
        console.log(`   📄 Invoice: ${sub.invoice_number || 'N/A'} (₱${sub.invoice_amount || 'N/A'})`);
        console.log(`   📅 Due Date: ${sub.due_date ? new Date(sub.due_date).toLocaleDateString() : 'N/A'}`);
        console.log(`   📅 Subscribed: ${new Date(sub.subscription_created).toLocaleDateString()}`);
        console.log('   ─'.repeat(50));
      });
    }
    
    // 3. Summary statistics
    console.log('\n📈 SUBSCRIPTION SUMMARY:');
    console.log('═'.repeat(80));
    
    const summaryQuery = `
      SELECT 
        cs.status,
        cs.payment_status,
        cs.payment_method,
        COUNT(*) as count,
        SUM(sp.price::numeric) as total_revenue
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      GROUP BY cs.status, cs.payment_status, cs.payment_method
      ORDER BY cs.status, cs.payment_status, cs.payment_method
    `;
    
    const summaryResults = await pool.query(summaryQuery);
    
    summaryResults.rows.forEach(row => {
      console.log(`${row.status.toUpperCase()} | ${row.payment_status.toUpperCase()} | ${row.payment_method.toUpperCase()}: ${row.count} users (₱${row.total_revenue} total)`);
    });
    
    // 4. Revenue breakdown
    console.log('\n💰 REVENUE BREAKDOWN:');
    console.log('═'.repeat(80));
    
    const revenueQuery = `
      SELECT 
        sp.plan_name,
        COUNT(cs.subscription_id) as subscribers,
        SUM(CASE WHEN cs.status = 'active' AND cs.payment_status = 'paid' THEN sp.price::numeric ELSE 0 END) as confirmed_revenue,
        SUM(CASE WHEN cs.status = 'pending_payment' THEN sp.price::numeric ELSE 0 END) as pending_revenue,
        SUM(sp.price::numeric) as total_potential_revenue
      FROM subscription_plans sp
      LEFT JOIN customer_subscriptions cs ON sp.plan_id = cs.plan_id
      GROUP BY sp.plan_id, sp.plan_name, sp.price
      ORDER BY confirmed_revenue DESC
    `;
    
    const revenueResults = await pool.query(revenueQuery);
    
    revenueResults.rows.forEach(row => {
      console.log(`${row.plan_name}:`);
      console.log(`   👥 Subscribers: ${row.subscribers || 0}`);
      console.log(`   ✅ Confirmed Revenue: ₱${row.confirmed_revenue || 0}`);
      console.log(`   ⏳ Pending Revenue: ₱${row.pending_revenue || 0}`);
      console.log(`   💎 Total Potential: ₱${row.total_potential_revenue || 0}`);
      console.log('');
    });
    
    console.log('🎯 QUICK ACTIONS:');
    console.log('═'.repeat(80));
    console.log('• Follow up with pending payment users');
    console.log('• Send payment reminders via SMS/email');
    console.log('• Check collection schedules for active subscribers');
    console.log('• Update payment confirmations for cash payments');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkPaidActiveSubscriptions();
