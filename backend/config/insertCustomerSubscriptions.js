const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'waste_collection_db',
  password: 'root',
  port: 5432,
});

async function insertCustomerSubscriptions() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting to insert customer subscription data...\n');
    
    // First, let's check what users exist
    console.log('📋 Checking existing users...');
    const usersResult = await client.query(`
      SELECT user_id, username, contact_number
      FROM users
      WHERE username NOT LIKE 'admin%'
      LIMIT 15
    `);
    
    console.log(`Found ${usersResult.rows.length} users`);
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.username} (ID: ${user.user_id})`);
    });
    
    // If no users exist, create some sample users first
    if (usersResult.rows.length === 0) {
      console.log('\n📝 Creating sample users...');
      const sampleUsers = [
        { username: 'john.doe', contact_number: '09171234567' },
        { username: 'jane.smith', contact_number: '09171234568' },
        { username: 'mike.johnson', contact_number: '09171234569' },
        { username: 'sarah.wilson', contact_number: '09171234570' },
        { username: 'david.brown', contact_number: '09171234571' },
        { username: 'lisa.garcia', contact_number: '09171234572' },
        { username: 'robert.martinez', contact_number: '09171234573' },
        { username: 'emily.rodriguez', contact_number: '09171234574' },
        { username: 'james.lee', contact_number: '09171234575' },
        { username: 'maria.gonzalez', contact_number: '09171234576' },
        { username: 'thomas.anderson', contact_number: '09171234577' },
        { username: 'jennifer.taylor', contact_number: '09171234578' },
        { username: 'christopher.moore', contact_number: '09171234579' },
        { username: 'amanda.jackson', contact_number: '09171234580' },
        { username: 'daniel.white', contact_number: '09171234581' }
      ];
      
      for (const userData of sampleUsers) {
        const userQuery = `
          INSERT INTO users (username, password_hash, contact_number, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING user_id
        `;
        const userResult = await client.query(userQuery, [
          userData.username,
          '$2b$10$dummy.hash.for.testing', // Dummy password hash
          userData.contact_number
        ]);
        console.log(`   ✅ Created user: ${userData.username} (ID: ${userResult.rows[0].user_id})`);
      }
      
      // Refresh users list
      const newUsersResult = await client.query(`
        SELECT user_id, username, contact_number
        FROM users
        WHERE username NOT LIKE 'admin%'
        LIMIT 15
      `);
      usersResult.rows = newUsersResult.rows;
    }
    
    // Get subscription plans
    console.log('\n📋 Available subscription plans:');
    const plansResult = await client.query('SELECT * FROM subscription_plans');
    const householdPlan = plansResult.rows.find(p => p.plan_name === 'Household');
    const mixedPlan = plansResult.rows.find(p => p.plan_name === 'Mixed/Heavy');
    
    if (!householdPlan || !mixedPlan) {
      console.log('Creating default subscription plans...');
      await client.query(`
        INSERT INTO subscription_plans (plan_name, price, frequency, description, status)
        VALUES 
          ('Household', 1200.00, 'monthly', 'Standard household waste collection service', 'active'),
          ('Mixed/Heavy', 850.00, 'weekly', 'Heavy waste and mixed materials collection service', 'active')
        ON CONFLICT (plan_name) DO NOTHING
      `);
      
      const newPlansResult = await client.query('SELECT * FROM subscription_plans');
      const newHouseholdPlan = newPlansResult.rows.find(p => p.plan_name === 'Household');
      const newMixedPlan = newPlansResult.rows.find(p => p.plan_name === 'Mixed/Heavy');
      
      console.log(`   - Household: ₱${newHouseholdPlan.price} (ID: ${newHouseholdPlan.plan_id})`);
      console.log(`   - Mixed/Heavy: ₱${newMixedPlan.price} (ID: ${newMixedPlan.plan_id})`);
    } else {
      console.log(`   - Household: ₱${householdPlan.price} (ID: ${householdPlan.plan_id})`);
      console.log(`   - Mixed/Heavy: ₱${mixedPlan.price} (ID: ${mixedPlan.plan_id})`);
    }
    
    // Check existing subscriptions
    console.log('\n📋 Checking existing subscriptions...');
    const existingSubscriptions = await client.query('SELECT * FROM customer_subscriptions');
    console.log(`Found ${existingSubscriptions.rows.length} existing subscriptions`);
    
    // Create customer subscriptions
    console.log('\n📝 Creating customer subscriptions...');
    const subscriptions = [];
    const paymentMethods = ['Cash', 'Bank Transfer', 'Online Payment', 'GCash', 'Credit Card'];
    const statuses = ['active', 'active', 'active', 'suspended', 'active']; // Mostly active
    
    for (let i = 0; i < Math.min(usersResult.rows.length, 12); i++) {
      const user = usersResult.rows[i];
      const plan = i % 3 === 0 ? householdPlan : mixedPlan; // 1/3 household, 2/3 mixed
      
      // Check if subscription already exists
      const existingSubscription = existingSubscriptions.rows.find(
        sub => sub.user_id === user.user_id && sub.plan_id === plan.plan_id
      );
      
      if (existingSubscription) {
        console.log(`   ⏭️  Subscription already exists for ${user.username} - ${plan.plan_name}`);
        subscriptions.push(existingSubscription);
        continue;
      }
      
      // Stagger billing start dates
      const billingStartDate = new Date(2024, 0, 1); // January 1, 2024
      billingStartDate.setDate(billingStartDate.getDate() + (i * 15)); // Every 15 days
      
      const subscriptionQuery = `
        INSERT INTO customer_subscriptions (user_id, plan_id, billing_start_date, payment_method, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const subscription = await client.query(subscriptionQuery, [
        user.user_id,
        plan.plan_id,
        billingStartDate.toISOString().split('T')[0],
        paymentMethods[i % paymentMethods.length],
        statuses[i % statuses.length]
      ]);
      
      subscriptions.push(subscription.rows[0]);
      console.log(`   ✅ Created subscription for ${user.username} - ${plan.plan_name} (₱${plan.price})`);
    }
    
    // Generate invoices for the subscriptions
    console.log('\n📝 Generating invoices...');
    const invoices = [];
    
    for (const subscription of subscriptions) {
      // Generate invoices for the last 4 months
      for (let month = 0; month < 4; month++) {
        const invoiceDate = new Date(2024, 11 - month, 1); // Last 4 months
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days
        
        const plan = subscription.plan_id === householdPlan.plan_id ? householdPlan : mixedPlan;
        
        // Generate a unique invoice number
        const invoiceNumber = `INV-${subscription.subscription_id}-${month + 1}`;
        
        // Check if invoice already exists
        const existingInvoice = await client.query(
          'SELECT * FROM invoices WHERE invoice_number = $1',
          [invoiceNumber]
        );
        
        if (existingInvoice.rows.length > 0) {
          console.log(`   ⏭️  Invoice ${invoiceNumber} already exists`);
          invoices.push(existingInvoice.rows[0]);
          continue;
        }
        
        const invoiceQuery = `
          INSERT INTO invoices (invoice_number, subscription_id, amount, due_date, status, generated_date, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        // Randomize status for variety
        const statuses = ['paid', 'unpaid', 'partially_paid', 'overdue'];
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
    
    // Create payments for paid and partially paid invoices
    console.log('\n📝 Creating payments...');
    const payments = [];
    
    // Get some collectors for payments
    const collectorsResult = await client.query(`
      SELECT c.collector_id, u.username
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LIMIT 3
    `);
    
    for (const invoice of invoices) {
      if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
        // Check if payment already exists for this invoice
        const existingPayment = await client.query(
          'SELECT * FROM payments WHERE invoice_id = $1',
          [invoice.invoice_id]
        );
        
        if (existingPayment.rows.length > 0) {
          console.log(`   ⏭️  Payment already exists for invoice ${invoice.invoice_number}`);
          payments.push(existingPayment.rows[0]);
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
        
        const paymentMethods = ['Cash', 'Bank Transfer', 'Online Payment', 'GCash'];
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
    
    // Add late fees to overdue invoices
    console.log('\n📝 Adding late fees to overdue invoices...');
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
    
    for (const invoice of overdueInvoices) {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysLate > 0) {
        const lateFees = daysLate * 50; // ₱50 per day late fee
        
        const updateQuery = `
          UPDATE invoices 
          SET late_fees = $1, updated_at = CURRENT_TIMESTAMP
          WHERE invoice_id = $2
          RETURNING *
        `;
        
        await client.query(updateQuery, [lateFees, invoice.invoice_id]);
        console.log(`   ✅ Added ₱${lateFees} late fees to invoice ${invoice.invoice_number} (${daysLate} days late)`);
      }
    }
    
    // Summary
    console.log('\n📊 Customer Subscription Data Summary:');
    console.log(`   - Customer Subscriptions Created: ${subscriptions.length}`);
    console.log(`   - Invoices Generated: ${invoices.length}`);
    console.log(`   - Payments Created: ${payments.length}`);
    console.log(`   - Overdue Invoices: ${overdueInvoices.length}`);
    
    console.log('\n🎉 Customer subscription data inserted successfully!');
    console.log('💡 You can now test the billing history with real transaction data.');
    
  } catch (error) {
    console.error('❌ Error inserting customer subscription data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the insertion if this file is executed directly
if (require.main === module) {
  insertCustomerSubscriptions()
    .then(() => {
      console.log('✅ Customer subscription data insertion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Customer subscription data insertion failed:', error);
      process.exit(1);
    });
}

module.exports = { insertCustomerSubscriptions }; 