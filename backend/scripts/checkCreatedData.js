const { pool } = require('../config/db');

async function checkCreatedData() {
  try {
    console.log('🔍 CHECKING CREATED BILLING DATA');
    console.log('================================');
    
    // Check users created
    const usersResult = await pool.query(`
      SELECT u.user_id, u.username, u.email, 
             COALESCE(un.first_name || ' ' || un.last_name, u.username) as full_name,
             a.street, a.block, a.lot, b.barangay_name
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE b.barangay_name = 'San Isidro'
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    
    console.log(`👥 Users in San Isidro (${usersResult.rows.length} found):`);
    usersResult.rows.forEach(user => {
      console.log(`   • ${user.full_name} - ${user.street} Block ${user.block} Lot ${user.lot}`);
    });
    
    // Check subscriptions
    const subscriptionsResult = await pool.query(`
      SELECT cs.subscription_id, cs.user_id, cs.status, cs.payment_status, 
             cs.payment_method, cs.billing_start_date, cs.next_billing_date,
             sp.plan_name, sp.price,
             COALESCE(un.first_name || ' ' || un.last_name, u.username) as user_name
      FROM customer_subscriptions cs
      JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE b.barangay_name = 'San Isidro'
      ORDER BY cs.created_at DESC
    `);
    
    console.log(`\n📋 Subscriptions (${subscriptionsResult.rows.length} found):`);
    subscriptionsResult.rows.forEach(sub => {
      console.log(`   • ${sub.user_name} - ${sub.plan_name} (₱${sub.price}) - Status: ${sub.status}`);
    });
    
    // Check invoices
    const invoicesResult = await pool.query(`
      SELECT i.invoice_id, i.invoice_number, i.amount, i.status, 
             i.generated_date, i.due_date,
             COALESCE(un.first_name || ' ' || un.last_name, u.username) as user_name
      FROM invoices i
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE b.barangay_name = 'San Isidro'
      ORDER BY i.generated_date DESC
      LIMIT 15
    `);
    
    console.log(`\n💰 Invoices (${invoicesResult.rows.length} found):`);
    invoicesResult.rows.forEach(inv => {
      console.log(`   • ${inv.user_name} - ${inv.invoice_number} - ₱${inv.amount} (${inv.status}) - ${inv.generated_date.toDateString()}`);
    });
    
    // Check payments
    const paymentsResult = await pool.query(`
      SELECT p.payment_id, p.amount, p.payment_method, p.payment_date, 
             p.reference_number,
             COALESCE(un.first_name || ' ' || un.last_name, u.username) as user_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.invoice_id
      JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE b.barangay_name = 'San Isidro'
      ORDER BY p.payment_date DESC
      LIMIT 15
    `);
    
    console.log(`\n💳 Payments (${paymentsResult.rows.length} found):`);
    paymentsResult.rows.forEach(pay => {
      console.log(`   • ${pay.user_name} - ₱${pay.amount} via ${pay.payment_method} - ${pay.payment_date.toDateString()} (${pay.reference_number})`);
    });
    
    // Check collection events
    const collectionsResult = await pool.query(`
      SELECT cse.user_id, cse.action, cse.amount, cse.notes, cse.created_at,
             COALESCE(un.first_name || ' ' || un.last_name, u.username) as user_name
      FROM collection_stop_events cse
      JOIN users u ON cse.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      JOIN addresses a ON u.address_id = a.address_id
      JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE b.barangay_name = 'San Isidro'
      ORDER BY cse.created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n🚛 Collection Events (${collectionsResult.rows.length} found):`);
    collectionsResult.rows.forEach(col => {
      const amountText = col.amount ? ` - ₱${col.amount}` : '';
      const notesText = col.notes ? ` (${col.notes})` : '';
      console.log(`   • ${col.user_name} - ${col.action}${amountText}${notesText} - ${col.created_at.toDateString()}`);
    });
    
    // Summary for reports
    console.log('\n📊 SUMMARY FOR REPORTS:');
    console.log('=======================');
    console.log(`Total Users: ${usersResult.rows.length}`);
    console.log(`Total Subscriptions: ${subscriptionsResult.rows.length}`);
    console.log(`Total Invoices: ${invoicesResult.rows.length}`);
    console.log(`Total Payments: ${paymentsResult.rows.length}`);
    console.log(`Total Collections: ${collectionsResult.rows.length}`);
    
    const totalPaymentAmount = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    console.log(`Total Payment Amount: ₱${totalPaymentAmount.toFixed(2)}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCreatedData();
