const { pool } = require('../config/db');

async function generateMissingInvoices() {
  try {
    console.log('🔍 Generating missing invoices for active subscriptions...');
    
    // Get all active subscriptions without invoices
    const subscriptionsQuery = `
      SELECT 
        cs.subscription_id,
        cs.user_id,
        cs.plan_id,
        cs.billing_start_date,
        cs.payment_method,
        sp.plan_name,
        sp.price
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.status = 'active'
      AND cs.user_id NOT IN (SELECT DISTINCT user_id FROM invoices WHERE user_id IS NOT NULL)
    `;
    
    const subscriptions = await pool.query(subscriptionsQuery);
    console.log(`📋 Found ${subscriptions.rows.length} active subscriptions without invoices`);
    
    if (subscriptions.rows.length === 0) {
      console.log('✅ No missing invoices to generate');
      return;
    }
    
    // Generate invoices for each subscription
    for (const subscription of subscriptions.rows) {
      const currentDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
      
      // Generate invoice number (format: INV-YYYY-MM-XXXXX)
      const invoiceNumber = `INV-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(subscription.user_id).padStart(5, '0')}`;
      
      const invoiceData = {
        invoice_number: invoiceNumber,
        user_id: subscription.user_id,
        plan_id: subscription.plan_id,
        due_date: dueDate.toISOString().split('T')[0],
        generated_date: currentDate.toISOString().split('T')[0],
        service_start: subscription.billing_start_date,
        service_end: new Date(new Date(subscription.billing_start_date).setMonth(new Date(subscription.billing_start_date).getMonth() + 1)).toISOString().split('T')[0],
        invoice_type: 'regular',
        amount: subscription.price,
        notes: `Initial invoice for ${subscription.plan_name} subscription`
      };
      
      const insertQuery = `
        INSERT INTO invoices (
          invoice_number, user_id, plan_id, due_date, generated_date, 
          service_start, service_end, invoice_type, amount, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [
        invoiceData.invoice_number,
        invoiceData.user_id,
        invoiceData.plan_id,
        invoiceData.due_date,
        invoiceData.generated_date,
        invoiceData.service_start,
        invoiceData.service_end,
        invoiceData.invoice_type,
        invoiceData.amount,
        invoiceData.notes
      ]);
      
      console.log(`✅ Generated invoice for user ${subscription.user_id}:`, {
        invoice_id: result.rows[0].invoice_id,
        invoice_number: result.rows[0].invoice_number,
        plan: subscription.plan_name,
        amount: `₱${subscription.price}`,
        due_date: invoiceData.due_date
      });
    }
    
    console.log('\n🎉 All missing invoices generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating missing invoices:', error);
  } finally {
    pool.end();
  }
}

generateMissingInvoices();
