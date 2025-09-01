const { pool } = require('../config/db');

async function checkInvoiceGeneration() {
  try {
    console.log('🔍 Checking invoice generation status...');
    
    // 1. Check all invoices with details
    const invoicesQuery = `
      SELECT 
        i.invoice_id,
        i.invoice_number,
        i.user_id,
        u.username,
        i.amount,
        i.status,
        i.due_date,
        i.generated_date,
        i.created_at,
        sp.plan_name,
        sp.price
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON i.plan_id = sp.plan_id
      ORDER BY i.created_at DESC
    `;
    
    const invoices = await pool.query(invoicesQuery);
    console.log(`\n📋 Total Invoices: ${invoices.rows.length}`);
    
    if (invoices.rows.length > 0) {
      console.log('\n✅ Recent Invoices:');
      console.table(invoices.rows.map(inv => ({
        ID: inv.invoice_id,
        Number: inv.invoice_number,
        User: inv.username || `User ${inv.user_id}`,
        Plan: inv.plan_name,
        Amount: `₱${inv.amount}`,
        Status: inv.status,
        DueDate: inv.due_date,
        Generated: inv.generated_date,
        CreatedAt: inv.created_at?.toISOString().split('T')[0]
      })));
    }
    
    // 2. Check subscription-invoice relationship
    const subscriptionInvoiceQuery = `
      SELECT 
        cs.subscription_id,
        cs.user_id,
        u.username,
        cs.status as subscription_status,
        cs.payment_status,
        sp.plan_name,
        COUNT(i.invoice_id) as invoice_count,
        MAX(i.created_at) as latest_invoice
      FROM customer_subscriptions cs
      LEFT JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      LEFT JOIN invoices i ON cs.user_id = i.user_id
      GROUP BY cs.subscription_id, cs.user_id, u.username, cs.status, cs.payment_status, sp.plan_name
      ORDER BY cs.created_at DESC
    `;
    
    const subInvoices = await pool.query(subscriptionInvoiceQuery);
    console.log('\n📊 Subscription-Invoice Summary:');
    console.table(subInvoices.rows.map(sub => ({
      SubscriptionID: sub.subscription_id,
      User: sub.username || `User ${sub.user_id}`,
      Plan: sub.plan_name,
      SubStatus: sub.subscription_status,
      PaymentStatus: sub.payment_status,
      InvoiceCount: sub.invoice_count,
      LatestInvoice: sub.latest_invoice?.toISOString().split('T')[0] || 'None'
    })));
    
    // 3. Check for missing invoices
    const missingInvoicesQuery = `
      SELECT 
        cs.subscription_id,
        cs.user_id,
        u.username,
        cs.status,
        sp.plan_name
      FROM customer_subscriptions cs
      LEFT JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.status = 'active'
      AND cs.user_id NOT IN (SELECT DISTINCT user_id FROM invoices WHERE user_id IS NOT NULL)
    `;
    
    const missing = await pool.query(missingInvoicesQuery);
    if (missing.rows.length > 0) {
      console.log('\n⚠️ Active Subscriptions WITHOUT Invoices:');
      console.table(missing.rows);
    } else {
      console.log('\n✅ All active subscriptions have invoices');
    }
    
    // 4. Invoice generation statistics
    const statsQuery = `
      SELECT 
        DATE(created_at) as generation_date,
        COUNT(*) as invoices_generated,
        SUM(amount) as total_amount
      FROM invoices
      GROUP BY DATE(created_at)
      ORDER BY generation_date DESC
      LIMIT 7
    `;
    
    const stats = await pool.query(statsQuery);
    if (stats.rows.length > 0) {
      console.log('\n📈 Invoice Generation by Date (Last 7 days):');
      console.table(stats.rows.map(stat => ({
        Date: stat.generation_date,
        Count: stat.invoices_generated,
        TotalAmount: `₱${parseFloat(stat.total_amount).toFixed(2)}`
      })));
    }
    
    console.log('\n🎯 Summary:');
    console.log(`• Total invoices in system: ${invoices.rows.length}`);
    console.log(`• Active subscriptions without invoices: ${missing.rows.length}`);
    console.log(`• Latest invoice generated: ${invoices.rows[0]?.created_at?.toISOString().split('T')[0] || 'None'}`);
    
  } catch (error) {
    console.error('❌ Error checking invoice generation:', error);
  } finally {
    pool.end();
  }
}

checkInvoiceGeneration();
