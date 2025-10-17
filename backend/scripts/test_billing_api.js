const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function testBillingData() {
  try {
    console.log('🔍 Testing Billing Data for Admin Dashboard...');
    console.log('=' .repeat(60));
    
    // Test the exact query used by admin billing
    console.log('\n📋 TESTING ADMIN BILLING QUERY:');
    const billingQuery = `
      SELECT 
        i.*, 
        u.username,
        sp.plan_name
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON i.plan_id = sp.plan_id
      ORDER BY i.created_at DESC
      LIMIT 10
    `;
    
    const invoices = await pool.query(billingQuery);
    
    console.log(`✅ Found ${invoices.rows.length} invoices`);
    console.log('\n📄 Sample Invoice Data:');
    
    if (invoices.rows.length > 0) {
      invoices.rows.slice(0, 3).forEach((invoice, index) => {
        console.log(`\n${index + 1}. Invoice ${invoice.invoice_number}:`);
        console.log(`   • User: ${invoice.username || 'Unknown'}`);
        console.log(`   • Plan: ${invoice.plan_name || 'Unknown Plan'}`);
        console.log(`   • Amount: ₱${invoice.amount}`);
        console.log(`   • Status: ${invoice.status}`);
        console.log(`   • Due Date: ${invoice.due_date}`);
        console.log(`   • Generated: ${invoice.generated_date}`);
      });
    } else {
      console.log('❌ No invoices found');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 BILLING STATISTICS:');
    
    // Get billing stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'overdue' OR (status = 'unpaid' AND due_date < CURRENT_DATE) THEN 1 END) as overdue_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as unpaid_amount
      FROM invoices
    `;
    
    const stats = await pool.query(statsQuery);
    const stat = stats.rows[0];
    
    console.log(`📈 Total Invoices: ${stat.total_invoices}`);
    console.log(`💰 Total Amount: ₱${parseFloat(stat.total_amount || 0).toLocaleString()}`);
    console.log(`✅ Paid: ${stat.paid_count} (₱${parseFloat(stat.paid_amount || 0).toLocaleString()})`);
    console.log(`⏳ Unpaid: ${stat.unpaid_count} (₱${parseFloat(stat.unpaid_amount || 0).toLocaleString()})`);
    console.log(`⚠️  Overdue: ${stat.overdue_count}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('👥 SUBSCRIPTION STATISTICS:');
    
    // Get subscription stats
    const subStatsQuery = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
      FROM customer_subscriptions
    `;
    
    const subStats = await pool.query(subStatsQuery);
    const subStat = subStats.rows[0];
    
    console.log(`📊 Total Subscriptions: ${subStat.total_subscriptions}`);
    console.log(`✅ Active: ${subStat.active_count}`);
    console.log(`⏳ Pending Payment: ${subStat.pending_count}`);
    console.log(`⏸️  Suspended: ${subStat.suspended_count}`);
    console.log(`❌ Cancelled: ${subStat.cancelled_count}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('💳 PAYMENT STATISTICS:');
    
    // Get payment stats
    const paymentStatsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_paid,
        COUNT(CASE WHEN payment_method = 'GCash' THEN 1 END) as gcash_payments,
        COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_payments,
        AVG(amount) as avg_payment
      FROM payments
    `;
    
    const paymentStats = await pool.query(paymentStatsQuery);
    const paymentStat = paymentStats.rows[0];
    
    console.log(`💰 Total Payments: ${paymentStat.total_payments}`);
    console.log(`💵 Total Amount Paid: ₱${parseFloat(paymentStat.total_paid || 0).toLocaleString()}`);
    console.log(`📱 GCash Payments: ${paymentStat.gcash_payments}`);
    console.log(`💵 Cash Payments: ${paymentStat.cash_payments}`);
    console.log(`📊 Average Payment: ₱${parseFloat(paymentStat.avg_payment || 0).toFixed(2)}`);
    
    console.log('\n✅ Billing data test completed!');
    console.log('🎯 Your admin billing should show this data.');
    
  } catch (error) {
    console.error('❌ Error testing billing data:', error);
  } finally {
    await pool.end();
  }
}

testBillingData().catch(console.error);
