const { Pool } = require('pg');
const { schedulingPool } = require('./db');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'waste_collection_db',
  password: 'root',
  port: 5432,
});

async function insertBillingData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting to insert sample billing data...\n');
    
    // First, let's check what residents and collectors exist
    console.log('📋 Checking existing residents...');
    const residentsResult = await client.query(`
      SELECT 
        r.resident_id,
        r.user_id,
        r.first_name,
        r.middle_name,
        r.last_name,
        r.street_address,
        r.barangay,
        r.city,
        u.username,
        u.contact_number
      FROM residents r
      JOIN users u ON r.user_id = u.user_id
      LIMIT 5
    `);
    
    console.log(`Found ${residentsResult.rows.length} residents`);
    residentsResult.rows.forEach(resident => {
      console.log(`   - ${resident.first_name} ${resident.last_name} (ID: ${resident.resident_id})`);
    });
    
    console.log('\n📋 Checking existing collectors...');
    const collectorsResult = await client.query(`
      SELECT 
        c.collector_id,
        c.user_id,
        c.license_number,
        c.status,
        u.username
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LIMIT 3
    `);
    
    console.log(`Found ${collectorsResult.rows.length} collectors`);
    collectorsResult.rows.forEach(collector => {
      console.log(`   - Collector ID: ${collector.collector_id}, License: ${collector.license_number}`);
    });
    
    // Get subscription plans
    const plansResult = await client.query('SELECT * FROM subscription_plans');
    const householdPlan = plansResult.rows.find(p => p.plan_name === 'Household');
    const mixedPlan = plansResult.rows.find(p => p.plan_name === 'Mixed/Heavy');
    
    console.log('\n📋 Available subscription plans:');
    console.log(`   - Household: ₱${householdPlan.price} (ID: ${householdPlan.plan_id})`);
    console.log(`   - Mixed/Heavy: ₱${mixedPlan.price} (ID: ${mixedPlan.plan_id})`);
    
    // Check existing subscriptions
    console.log('\n📋 Checking existing subscriptions...');
    const existingSubscriptions = await client.query('SELECT * FROM customer_subscriptions');
    console.log(`Found ${existingSubscriptions.rows.length} existing subscriptions`);
    
    // Insert customer subscriptions for existing residents (skip if already exists)
    console.log('\n📝 Creating customer subscriptions...');
    const subscriptions = [];
    
    for (let i = 0; i < Math.min(residentsResult.rows.length, 2); i++) {
      const resident = residentsResult.rows[i];
      const plan = i % 2 === 0 ? householdPlan : mixedPlan;
      
      // Check if subscription already exists
      const existingSubscription = existingSubscriptions.rows.find(
        sub => sub.resident_id === resident.resident_id && sub.plan_id === plan.plan_id
      );
      
      if (existingSubscription) {
        console.log(`   ⏭️  Subscription already exists for ${resident.first_name} ${resident.last_name} - ${plan.plan_name}`);
        subscriptions.push(existingSubscription);
        continue;
      }
      
      const billingStartDate = new Date(2024, 0, 1); // January 1, 2024
      billingStartDate.setDate(billingStartDate.getDate() + (i * 30)); // Stagger start dates
      
      const subscriptionQuery = `
        INSERT INTO customer_subscriptions (resident_id, plan_id, billing_start_date, payment_method, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const paymentMethods = ['Cash', 'Bank Transfer', 'Online Payment'];
      const subscription = await client.query(subscriptionQuery, [
        resident.resident_id,
        plan.plan_id,
        billingStartDate.toISOString().split('T')[0],
        paymentMethods[i % paymentMethods.length],
        'active'
      ]);
      
      subscriptions.push(subscription.rows[0]);
      console.log(`   ✅ Created subscription for ${resident.first_name} ${resident.last_name} - ${plan.plan_name}`);
    }
    
    // Check existing invoices
    console.log('\n📋 Checking existing invoices...');
    const existingInvoices = await client.query('SELECT * FROM invoices');
    console.log(`Found ${existingInvoices.rows.length} existing invoices`);
    
    // Generate invoices for the subscriptions (skip if already exists)
    console.log('\n📝 Generating invoices...');
    const invoices = [];
    
    for (const subscription of subscriptions) {
      // Generate invoices for the last 3 months
      for (let month = 0; month < 3; month++) {
        const invoiceDate = new Date(2024, 11 - month, 1); // Last 3 months
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days
        
        const plan = subscription.plan_id === householdPlan.plan_id ? householdPlan : mixedPlan;
        
        // Generate a unique invoice number
        const invoiceNumber = `INV-${subscription.subscription_id}-${month + 1}`;
        
        // Check if invoice already exists
        const existingInvoice = existingInvoices.rows.find(
          inv => inv.invoice_number === invoiceNumber
        );
        
        if (existingInvoice) {
          console.log(`   ⏭️  Invoice ${invoiceNumber} already exists`);
          invoices.push(existingInvoice);
          continue;
        }
        
        const invoiceQuery = `
          INSERT INTO invoices (invoice_number, subscription_id, amount, due_date, status, generated_date, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        // Randomize status for variety
        const statuses = ['paid', 'unpaid', 'partially_paid'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const invoice = await client.query(invoiceQuery, [
          invoiceNumber,
          subscription.subscription_id,
          plan.price,
          dueDate.toISOString().split('T')[0],
          status,
          invoiceDate.toISOString().split('T')[0],
          `Monthly invoice for ${plan.plan_name} plan`
        ]);
        
        invoices.push(invoice.rows[0]);
        console.log(`   ✅ Generated invoice ${invoice.rows[0].invoice_number} - ${status} - Due: ${dueDate.toISOString().split('T')[0]}`);
      }
    }
    
    // Check existing payments
    console.log('\n📋 Checking existing payments...');
    const existingPayments = await client.query('SELECT * FROM payments');
    console.log(`Found ${existingPayments.rows.length} existing payments`);
    
    // Create payments for paid and partially paid invoices (skip if already exists)
    console.log('\n📝 Creating payments...');
    const payments = [];
    
    for (const invoice of invoices) {
      if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
        // Check if payment already exists for this invoice
        const existingPayment = existingPayments.rows.find(
          pay => pay.invoice_id === invoice.invoice_id
        );
        
        if (existingPayment) {
          console.log(`   ⏭️  Payment already exists for invoice ${invoice.invoice_number}`);
          payments.push(existingPayment);
          continue;
        }
        
        const paymentDate = new Date(invoice.due_date);
        paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 10)); // Paid before or on due date
        
        const paymentAmount = invoice.status === 'paid' ? invoice.amount : invoice.amount * 0.6; // 60% for partial
        
        const collector = collectorsResult.rows.length > 0 ? 
          collectorsResult.rows[Math.floor(Math.random() * collectorsResult.rows.length)] : null;
        
        const paymentQuery = `
          INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, collector_id, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const paymentMethods = ['Cash', 'Bank Transfer', 'Online Payment'];
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        
        const payment = await client.query(paymentQuery, [
          invoice.invoice_id,
          paymentAmount,
          paymentMethod,
          paymentDate.toISOString().split('T')[0],
          `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          collector ? collector.collector_id : null,
          `${paymentMethod} payment for ${invoice.invoice_number}`
        ]);
        
        payments.push(payment.rows[0]);
        console.log(`   ✅ Created payment ₱${paymentAmount} for invoice ${invoice.invoice_number}`);
      }
    }
    
    // Add some late fees to unpaid invoices
    console.log('\n📝 Adding late fees to overdue invoices...');
    const overdueInvoices = invoices.filter(inv => inv.status === 'unpaid');
    
    for (const invoice of overdueInvoices) {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysLate > 0) {
        const lateFees = daysLate * 50; // ₱50 per day late fee
        
        const updateQuery = `
          UPDATE invoices 
          SET late_fees = $1, status = 'overdue', updated_at = CURRENT_TIMESTAMP
          WHERE invoice_id = $2
          RETURNING *
        `;
        
        const updatedInvoice = await client.query(updateQuery, [lateFees, invoice.invoice_id]);
        console.log(`   ✅ Added ₱${lateFees} late fees to invoice ${invoice.invoice_number} (${daysLate} days late)`);
      }
    }
    
    // Summary
    console.log('\n📊 Billing Data Summary:');
    console.log(`   - Customer Subscriptions: ${subscriptions.length}`);
    console.log(`   - Invoices Generated: ${invoices.length}`);
    console.log(`   - Payments Created: ${payments.length}`);
    console.log(`   - Overdue Invoices: ${overdueInvoices.length}`);
    
    console.log('\n🎉 Sample billing data inserted successfully!');
    console.log('💡 You can now test the billing system with real data.');
    
  } catch (error) {
    console.error('❌ Error inserting billing data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function insertTestData() {
  try {
    // Clean up test data
    await schedulingPool.query(`DELETE FROM customer_subscriptions`);
    await schedulingPool.query(`DELETE FROM residents`);
    await schedulingPool.query(`DELETE FROM users WHERE username = 'testuser'`);
    await schedulingPool.query(`DELETE FROM subscription_plans WHERE plan_name = 'Test Plan'`);

    // Insert a test user
    const userRes = await schedulingPool.query(`
      INSERT INTO users (username, password, email, contact_number, created_at, updated_at)
      VALUES ('testuser', 'testpass', 'testuser@email.com', '09171234567', NOW(), NOW())
      RETURNING user_id;
    `);
    const userId = userRes.rows[0].user_id;

    // Insert a test resident
    const residentRes = await schedulingPool.query(`
      INSERT INTO residents (user_id, address, subdivision_id, subscription_status, created_at)
      VALUES ($1, '123 Test St', 1, 'active', NOW())
      RETURNING resident_id;
    `, [userId]);
    const residentId = residentRes.rows[0].resident_id;

    // Insert a test subscription plan
    const planRes = await schedulingPool.query(`
      INSERT INTO subscription_plans (plan_name, price, frequency, description, status, created_at, updated_at)
      VALUES ('Test Plan', 100.00, 'monthly', 'Test plan for billing', 'active', NOW(), NOW())
      RETURNING plan_id;
    `);
    const planId = planRes.rows[0].plan_id;

    // Insert a test customer subscription
    await schedulingPool.query(`
      INSERT INTO customer_subscriptions (resident_id, plan_id, billing_start_date, payment_method, status, created_at, updated_at)
      VALUES ($1, $2, NOW(), 'Cash', 'active', NOW(), NOW())
    `, [residentId, planId]);

    console.log('✅ Clean test billing data inserted successfully!');
  } catch (err) {
    console.error('❌ Error inserting test billing data:', err);
  } finally {
    await schedulingPool.end();
  }
}

// Run the insertion if this file is executed directly
if (require.main === module) {
  insertBillingData()
    .then(() => {
      console.log('✅ Sample data insertion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sample data insertion failed:', error);
      process.exit(1);
    });
}

module.exports = { insertBillingData }; 