const { pool } = require('./config/db');

async function insertNovemberSampleData() {
  try {
    console.log('🗓️ Inserting November 2025 sample data...');
    
    // First, get existing users from the database
    console.log('👥 Fetching existing users...');
    const usersQuery = `
      SELECT u.user_id, u.username, u.email, u.role_id, a.address_id, b.barangay_name
      FROM users u
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      WHERE u.approval_status = 'approved' AND u.user_id != 64
      ORDER BY u.user_id
      LIMIT 20
    `;
    const usersResult = await pool.query(usersQuery);
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.user_id}) in ${user.barangay_name || 'Unknown Barangay'}`);
    });
    
    if (users.length === 0) {
      console.error('❌ No users found! Cannot create sample data without existing users.');
      return;
    }
    
    // Get existing collectors
    console.log('\n🚛 Fetching existing collectors...');
    const collectorsQuery = `
      SELECT c.collector_id, u.username, u.user_id
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.status = 'active'
      LIMIT 10
    `;
    const collectorsResult = await pool.query(collectorsQuery);
    const collectors = collectorsResult.rows;
    
    console.log(`Found ${collectors.length} collectors:`);
    collectors.forEach(collector => {
      console.log(`  - ${collector.username} (Collector ID: ${collector.collector_id})`);
    });
    
    // Get existing subscription plans
    console.log('\n📋 Fetching subscription plans...');
    const plansQuery = `SELECT plan_id, plan_name, price FROM subscription_plans LIMIT 5`;
    const plansResult = await pool.query(plansQuery);
    const plans = plansResult.rows;
    
    console.log(`Found ${plans.length} subscription plans:`);
    plans.forEach(plan => {
      console.log(`  - ${plan.plan_name}: ₱${plan.price}`);
    });
    
    // November 2025 dates (1st to 30th)
    const novemberDates = [];
    for (let day = 1; day <= 30; day++) {
      novemberDates.push(`2025-11-${day.toString().padStart(2, '0')}`);
    }
    
    console.log('\n📦 Creating collection stop events (for Waste Pickup Reports)...');
    
    // Create collection stop events for November
    const collectionEvents = [];
    let eventCount = 0;
    
    for (let i = 0; i < 50; i++) { // Create 50 collection events
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomCollector = collectors.length > 0 ? collectors[Math.floor(Math.random() * collectors.length)] : null;
      const randomDate = novemberDates[Math.floor(Math.random() * novemberDates.length)];
      const randomTime = `${Math.floor(Math.random() * 12) + 8}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`;
      const actions = ['collected', 'missed'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      const randomAmount = Math.floor(Math.random() * 50) + 10; // 10-60 kg
      
      const insertEventQuery = `
        INSERT INTO collection_stop_events (
          user_id, collector_id, action, amount, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      try {
        await pool.query(insertEventQuery, [
          randomUser.user_id,
          randomCollector ? randomCollector.collector_id : null,
          randomAction,
          randomAmount,
          `${randomAction === 'collected' ? 'Successfully collected' : 'Resident not available'} - ${randomUser.barangay_name || 'Unknown Area'}`,
          `${randomDate} ${randomTime}`
        ]);
        eventCount++;
      } catch (error) {
        console.log(`⚠️ Skipped event for user ${randomUser.username}: ${error.message}`);
      }
    }
    
    console.log(`✅ Created ${eventCount} collection events`);
    
    // Create special pickup requests for November
    console.log('\n🎯 Creating special pickup requests...');
    
    let specialCount = 0;
    const wasteTypes = ['Electronics', 'Furniture', 'Garden Waste', 'Construction Debris', 'Appliances'];
    const statuses = ['completed', 'pending', 'assigned'];
    
    for (let i = 0; i < 15; i++) { // Create 15 special pickups
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomCollector = collectors.length > 0 ? collectors[Math.floor(Math.random() * collectors.length)] : null;
      const randomDate = novemberDates[Math.floor(Math.random() * novemberDates.length)];
      const randomTime = `${Math.floor(Math.random() * 12) + 8}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`;
      const randomWasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const bagQuantity = Math.floor(Math.random() * 5) + 1; // 1-5 bags
      const estimatedTotal = bagQuantity * 25; // ₱25 per bag
      const finalPrice = randomStatus === 'completed' ? estimatedTotal + Math.floor(Math.random() * 50) : null;
      
      const insertSpecialQuery = `
        INSERT INTO special_pickup_requests (
          user_id, collector_id, waste_type, bag_quantity, estimated_total, 
          final_price, status, pickup_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      try {
        await pool.query(insertSpecialQuery, [
          randomUser.user_id,
          randomCollector ? randomCollector.collector_id : null,
          randomWasteType,
          bagQuantity,
          estimatedTotal,
          finalPrice,
          randomStatus,
          randomDate,
          `${randomDate} ${randomTime}`
        ]);
        specialCount++;
      } catch (error) {
        console.log(`⚠️ Skipped special pickup for user ${randomUser.username}: ${error.message}`);
      }
    }
    
    console.log(`✅ Created ${specialCount} special pickup requests`);
    
    // Create customer subscriptions and invoices for November (for Cash Collection Reports)
    console.log('\n💰 Creating customer subscriptions and invoices...');
    
    let subscriptionCount = 0;
    let invoiceCount = 0;
    
    // Create subscriptions for users
    for (let i = 0; i < Math.min(users.length, 20); i++) {
      const user = users[i];
      const randomPlan = plans.length > 0 ? plans[Math.floor(Math.random() * plans.length)] : null;
      
      if (!randomPlan) continue;
      
      // Check if user already has a subscription
      const existingSubQuery = `SELECT subscription_id FROM customer_subscriptions WHERE user_id = $1`;
      const existingSub = await pool.query(existingSubQuery, [user.user_id]);
      
      let subscriptionId;
      
      if (existingSub.rows.length === 0) {
        // Create new subscription
        const insertSubQuery = `
          INSERT INTO customer_subscriptions (
            user_id, plan_id, status, start_date, next_billing_date
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING subscription_id
        `;
        
        try {
          const subResult = await pool.query(insertSubQuery, [
            user.user_id,
            randomPlan.plan_id,
            'active',
            '2025-11-01',
            '2025-12-01'
          ]);
          subscriptionId = subResult.rows[0].subscription_id;
          subscriptionCount++;
        } catch (error) {
          console.log(`⚠️ Skipped subscription for user ${user.username}: ${error.message}`);
          continue;
        }
      } else {
        subscriptionId = existingSub.rows[0].subscription_id;
      }
      
      // Create invoices for November
      const invoiceStatuses = ['paid', 'unpaid', 'overdue'];
      const randomStatus = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
      const randomDate = novemberDates[Math.floor(Math.random() * novemberDates.length)];
      const dueDate = new Date(randomDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      const insertInvoiceQuery = `
        INSERT INTO invoices (
          subscription_id, invoice_number, amount, status, 
          generated_date, due_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      try {
        await pool.query(insertInvoiceQuery, [
          subscriptionId,
          `INV-NOV-${(1000 + invoiceCount).toString()}`,
          randomPlan.price,
          randomStatus,
          randomDate,
          dueDate.toISOString().split('T')[0],
          `${randomPlan.plan_name} - November 2025 billing`
        ]);
        invoiceCount++;
      } catch (error) {
        console.log(`⚠️ Skipped invoice for user ${user.username}: ${error.message}`);
      }
    }
    
    console.log(`✅ Created ${subscriptionCount} subscriptions and ${invoiceCount} invoices`);
    
    console.log('\n🎉 November 2025 sample data creation completed!');
    console.log('\n📊 Summary:');
    console.log(`  - Collection Events: ${eventCount}`);
    console.log(`  - Special Pickups: ${specialCount}`);
    console.log(`  - Subscriptions: ${subscriptionCount}`);
    console.log(`  - Invoices: ${invoiceCount}`);
    console.log('\n✅ You can now generate Waste Pickup Reports and Cash Collection Reports for November 2025!');
    
  } catch (error) {
    console.error('❌ Error inserting November sample data:', error);
  } finally {
    await pool.end();
  }
}

insertNovemberSampleData();
