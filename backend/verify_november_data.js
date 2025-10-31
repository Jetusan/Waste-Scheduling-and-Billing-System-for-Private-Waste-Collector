const { pool } = require('./config/db');

async function verifyNovemberData() {
  try {
    console.log('🔍 Verifying November 2025 data...');
    
    // Check collection events
    console.log('\n📦 Collection Events for November 2025:');
    const eventsQuery = `
      SELECT 
        cse.created_at::date as collection_date,
        cse.action,
        u.username,
        uc.username as collector_name,
        cse.amount,
        cse.notes
      FROM collection_stop_events cse
      LEFT JOIN users u ON cse.user_id = u.user_id
      LEFT JOIN collectors c ON cse.collector_id = c.collector_id
      LEFT JOIN users uc ON c.user_id = uc.user_id
      WHERE DATE(cse.created_at) BETWEEN '2025-11-01' AND '2025-11-30'
      ORDER BY cse.created_at DESC
      LIMIT 10
    `;
    const eventsResult = await pool.query(eventsQuery);
    
    console.log(`Found ${eventsResult.rows.length} collection events (showing first 10):`);
    eventsResult.rows.forEach(event => {
      console.log(`  - ${event.collection_date}: ${event.username} - ${event.action} (${event.amount}kg) by ${event.collector_name || 'Unknown'}`);
    });
    
    // Check invoices
    console.log('\n💰 Invoices for November 2025:');
    const invoicesQuery = `
      SELECT 
        i.generated_date,
        i.invoice_number,
        i.amount,
        i.status,
        u.username,
        sp.plan_name
      FROM invoices i
      LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      LEFT JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE DATE(i.generated_date) BETWEEN '2025-11-01' AND '2025-11-30'
      ORDER BY i.generated_date DESC
      LIMIT 10
    `;
    const invoicesResult = await pool.query(invoicesQuery);
    
    console.log(`Found ${invoicesResult.rows.length} invoices (showing first 10):`);
    invoicesResult.rows.forEach(invoice => {
      console.log(`  - ${invoice.generated_date}: ${invoice.invoice_number} - ${invoice.username} - ₱${invoice.amount} (${invoice.status})`);
    });
    
    // Summary statistics
    console.log('\n📊 November 2025 Data Summary:');
    
    const totalEventsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN action = 'collected' THEN 1 END) as collected,
        COUNT(CASE WHEN action = 'missed' THEN 1 END) as missed,
        SUM(amount) as total_waste_kg
      FROM collection_stop_events 
      WHERE DATE(created_at) BETWEEN '2025-11-01' AND '2025-11-30'
    `;
    const totalEvents = await pool.query(totalEventsQuery);
    const eventStats = totalEvents.rows[0];
    
    console.log(`Collection Events:`);
    console.log(`  - Total: ${eventStats.total_events}`);
    console.log(`  - Collected: ${eventStats.collected}`);
    console.log(`  - Missed: ${eventStats.missed}`);
    console.log(`  - Total Waste: ${eventStats.total_waste_kg}kg`);
    
    const totalInvoicesQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
        SUM(amount) as total_amount
      FROM invoices 
      WHERE DATE(generated_date) BETWEEN '2025-11-01' AND '2025-11-30'
    `;
    const totalInvoices = await pool.query(totalInvoicesQuery);
    const invoiceStats = totalInvoices.rows[0];
    
    console.log(`\nInvoices:`);
    console.log(`  - Total: ${invoiceStats.total_invoices}`);
    console.log(`  - Paid: ${invoiceStats.paid}`);
    console.log(`  - Unpaid: ${invoiceStats.unpaid}`);
    console.log(`  - Overdue: ${invoiceStats.overdue}`);
    console.log(`  - Total Amount: ₱${invoiceStats.total_amount}`);
    
    console.log('\n✅ November 2025 data is ready for report generation!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to the Reports page in the admin panel');
    console.log('2. Select "Waste Pickup Report" and set date range to November 1-30, 2025');
    console.log('3. Select "Cash Collection Report" and set date range to November 1-30, 2025');
    console.log('4. Generate and view/download the reports');
    
  } catch (error) {
    console.error('❌ Error verifying November data:', error);
  } finally {
    await pool.end();
  }
}

verifyNovemberData();
