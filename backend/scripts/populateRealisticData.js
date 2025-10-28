const { pool } = require('../config/db');

/**
 * Populate WSBS Database with Realistic Sample Data
 * Creates legitimate users, subscriptions, payments, collections, and special pickups
 */

const realisticUsers = [
  { firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@gmail.com', phone: '09171234567' },
  { firstName: 'Juan', lastName: 'Cruz', email: 'juan.cruz@yahoo.com', phone: '09181234568' },
  { firstName: 'Ana', lastName: 'Garcia', email: 'ana.garcia@outlook.com', phone: '09191234569' },
  { firstName: 'Pedro', lastName: 'Lopez', email: 'pedro.lopez@gmail.com', phone: '09201234570' },
  { firstName: 'Rosa', lastName: 'Martinez', email: 'rosa.martinez@yahoo.com', phone: '09211234571' },
  { firstName: 'Carlos', lastName: 'Reyes', email: 'carlos.reyes@gmail.com', phone: '09221234572' },
  { firstName: 'Elena', lastName: 'Fernandez', email: 'elena.fernandez@outlook.com', phone: '09231234573' },
  { firstName: 'Miguel', lastName: 'Torres', email: 'miguel.torres@gmail.com', phone: '09241234574' },
  { firstName: 'Sofia', lastName: 'Morales', email: 'sofia.morales@yahoo.com', phone: '09251234575' },
  { firstName: 'Diego', lastName: 'Herrera', email: 'diego.herrera@gmail.com', phone: '09261234576' },
  { firstName: 'Carmen', lastName: 'Jimenez', email: 'carmen.jimenez@outlook.com', phone: '09271234577' },
  { firstName: 'Roberto', lastName: 'Vargas', email: 'roberto.vargas@gmail.com', phone: '09281234578' },
  { firstName: 'Lucia', lastName: 'Castillo', email: 'lucia.castillo@yahoo.com', phone: '09291234579' },
  { firstName: 'Fernando', lastName: 'Ruiz', email: 'fernando.ruiz@gmail.com', phone: '09301234580' },
  { firstName: 'Patricia', lastName: 'Ortega', email: 'patricia.ortega@outlook.com', phone: '09311234581' }
];

// Generate random addresses in VSM Heights Phase 1, San Isidro
const generateVSMAddress = () => {
  const streets = [
    'VSM Drive', 'Heights Boulevard', 'Phase 1 Avenue', 'VSM Street',
    'Heights Road', 'Villa Street', 'San Miguel Avenue', 'Heights Drive'
  ];
  
  return {
    street: streets[Math.floor(Math.random() * streets.length)],
    block: String(Math.floor(Math.random() * 10) + 1), // Random block 1-10
    lot: String(Math.floor(Math.random() * 25) + 1), // Random lot 1-25
    barangay: 'San Isidro',
    subdivision: 'VSM Heights Phase 1'
  };
};

async function populateRealisticData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting realistic data population...');
    
    // 1. Get or create San Isidro barangay
    const barangayName = 'San Isidro';
    let barangayId;
    
    const barangayResult = await client.query(
      'SELECT barangay_id FROM barangays WHERE barangay_name = $1',
      [barangayName]
    );
    
    if (barangayResult.rows.length === 0) {
      const insertResult = await client.query(
        'INSERT INTO barangays (barangay_name, city_id) VALUES ($1, $2) RETURNING barangay_id',
        [barangayName, 1] // Using city_id = 1 (assuming it exists)
      );
      barangayId = insertResult.rows[0].barangay_id;
    } else {
      barangayId = barangayResult.rows[0].barangay_id;
    }
    
    console.log('✅ Barangays created/verified');
    
    // 2. Get subscription plans
    const planResult = await client.query('SELECT plan_id, price FROM subscription_plans LIMIT 3');
    const plans = planResult.rows;
    
    if (plans.length === 0) {
      throw new Error('No subscription plans found. Please create subscription plans first.');
    }
    
    console.log(`✅ Found ${plans.length} subscription plans`);
    
    // 3. Create realistic users with addresses and subscriptions
    const createdUsers = [];
    
    for (let i = 0; i < realisticUsers.length; i++) {
      const user = realisticUsers[i];
      const address = generateVSMAddress(); // Generate random VSM address
      
      try {
        // Create user name
        const nameResult = await client.query(
          'INSERT INTO user_names (first_name, last_name) VALUES ($1, $2) RETURNING name_id',
          [user.firstName, user.lastName]
        );
        const nameId = nameResult.rows[0].name_id;
        
        // Create address
        const addressResult = await client.query(
          'INSERT INTO addresses (street, block, lot, barangay_id) VALUES ($1, $2, $3, $4) RETURNING address_id',
          [address.street, address.block, address.lot, barangayId]
        );
        const addressId = addressResult.rows[0].address_id;
        
        // Create user
        const username = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`;
        const hashedPassword = '$2b$10$example.hash.for.demo.purposes.only'; // Demo hash
        
        const userResult = await client.query(
          'INSERT INTO users (username, email, password_hash, contact_number, role_id, name_id, address_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id',
          [username, user.email, hashedPassword, user.phone, 2, nameId, addressId] // role_id 2 = resident
        );
        const userId = userResult.rows[0].user_id;
        
        // Create subscription
        const randomPlan = plans[Math.floor(Math.random() * plans.length)];
        const subscriptionResult = await client.query(
          `INSERT INTO customer_subscriptions 
           (user_id, plan_id, status, payment_status, payment_method, billing_start_date, next_billing_date, billing_cycle_count) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING subscription_id`,
          [
            userId, 
            randomPlan.plan_id, 
            'active', 
            'paid', 
            Math.random() > 0.5 ? 'GCash' : 'Cash',
            new Date(2024, 9, 1), // October 1, 2024
            new Date(2024, 10, 1), // November 1, 2024
            1
          ]
        );
        const subscriptionId = subscriptionResult.rows[0].subscription_id;
        
        createdUsers.push({
          userId,
          subscriptionId,
          planPrice: randomPlan.price,
          userName: `${user.firstName} ${user.lastName}`,
          paymentMethod: Math.random() > 0.5 ? 'GCash' : 'Cash',
          address: `${address.street} Block ${address.block} Lot ${address.lot}, VSM Heights Phase 1`
        });
        
        console.log(`   ✅ Created: ${user.firstName} ${user.lastName} - ${address.street} Block ${address.block} Lot ${address.lot}`);
        
      } catch (error) {
        console.warn(`⚠️ Skipping user ${user.firstName} ${user.lastName}: ${error.message}`);
      }
    }
    
    console.log(`✅ Created ${createdUsers.length} realistic users with subscriptions`);
    
    // 4. Create realistic invoices and payments
    const paymentMethods = ['Cash', 'GCash', 'PayMongo'];
    let totalPayments = 0;
    
    for (const user of createdUsers) {
      // Create 2-3 invoices per user (October and November)
      const invoiceCount = Math.floor(Math.random() * 2) + 2; // 2-3 invoices
      
      for (let i = 0; i < invoiceCount; i++) {
        const invoiceDate = new Date(2024, 9 + i, Math.floor(Math.random() * 28) + 1); // Random date in Oct/Nov
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 7); // Due 7 days after invoice
        
        // Create invoice with shorter invoice number
        const invoiceResult = await client.query(
          `INSERT INTO invoices 
           (subscription_id, invoice_number, amount, status, generated_date, due_date, service_start, service_end) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING invoice_id`,
          [
            user.subscriptionId,
            `INV${Math.floor(Math.random() * 100000)}`, // Shorter format: INV12345
            user.planPrice,
            'paid',
            invoiceDate,
            dueDate,
            invoiceDate,
            new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days later
          ]
        );
        const invoiceId = invoiceResult.rows[0].invoice_id;
        
        // Create payment
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const paymentDate = new Date(dueDate.getTime() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000); // Pay within 5 days of due
        
        await client.query(
          `INSERT INTO payments 
           (invoice_id, amount, payment_method, payment_date, reference_number) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            invoiceId,
            user.planPrice,
            paymentMethod,
            paymentDate,
            `PAY${Math.floor(Math.random() * 100000)}` // Shorter format: PAY12345
          ]
        );
        
        totalPayments++;
      }
    }
    
    console.log(`✅ Created ${totalPayments} realistic payments`);
    
    // 5. Create realistic collection events
    const collectionActions = ['collected', 'missed'];
    const missedReasons = ['Not available', 'Gate locked', 'No waste prepared', 'Resident not home'];
    let totalCollections = 0;
    
    // Get a collector (create one if none exists)
    let collectorResult = await client.query('SELECT collector_id FROM collectors LIMIT 1');
    let collectorId;
    
    if (collectorResult.rows.length === 0) {
      // Create a sample collector
      const collectorUserResult = await client.query(
        'INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING user_id',
        ['collector.sample', 'collector@wsbs.com', hashedPassword, 3] // role_id 3 = collector
      );
      const collectorUserId = collectorUserResult.rows[0].user_id;
      
      const newCollectorResult = await client.query(
        'INSERT INTO collectors (user_id, status) VALUES ($1, $2) RETURNING collector_id',
        [collectorUserId, 'active']
      );
      collectorId = newCollectorResult.rows[0].collector_id;
    } else {
      collectorId = collectorResult.rows[0].collector_id;
    }
    
    // Create collection events for each user
    for (const user of createdUsers) {
      // Create 3-5 collection events per user
      const eventCount = Math.floor(Math.random() * 3) + 3; // 3-5 events
      
      for (let i = 0; i < eventCount; i++) {
        const eventDate = new Date(2024, 9, Math.floor(Math.random() * 30) + 1); // Random date in October
        const action = Math.random() > 0.8 ? 'missed' : 'collected'; // 80% collected, 20% missed
        
        let amount = null;
        let notes = null;
        
        if (action === 'collected' && user.paymentMethod === 'Cash') {
          amount = user.planPrice; // Cash collection amount
        } else if (action === 'missed') {
          notes = missedReasons[Math.floor(Math.random() * missedReasons.length)];
        }
        
        await client.query(
          `INSERT INTO collection_stop_events 
           (user_id, collector_id, action, amount, notes, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.userId, collectorId, action, amount, notes, eventDate]
        );
        
        totalCollections++;
      }
    }
    
    console.log(`✅ Created ${totalCollections} realistic collection events`);
    
    // 6. Create realistic special pickup requests
    const wasteTypes = ['Electronics', 'Furniture', 'Appliances', 'Construction Debris', 'Garden Waste'];
    const specialPickupStatuses = ['completed', 'in_progress', 'pending'];
    let totalSpecialPickups = 0;
    
    for (let i = 0; i < 8; i++) { // Create 8 special pickup requests
      const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
      const bagQuantity = Math.floor(Math.random() * 5) + 1; // 1-5 bags
      const estimatedTotal = bagQuantity * 25; // ₱25 per bag
      const status = specialPickupStatuses[Math.floor(Math.random() * specialPickupStatuses.length)];
      
      const requestDate = new Date(2024, 9, Math.floor(Math.random() * 30) + 1); // Random date in October
      
      let finalPrice = null;
      let priceStatus = 'pending';
      
      if (status === 'completed') {
        finalPrice = estimatedTotal + Math.floor(Math.random() * 50) - 25; // ±₱25 variation
        priceStatus = 'agreed';
      } else if (status === 'in_progress') {
        if (Math.random() > 0.5) {
          finalPrice = estimatedTotal;
          priceStatus = 'agreed';
        }
      }
      
      await client.query(
        `INSERT INTO special_pickup_requests 
         (user_id, collector_id, waste_type, bag_quantity, estimated_total, final_price, price_status, status, notes, created_at, pickup_date, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          user.userId,
          collectorId,
          wasteType,
          bagQuantity,
          estimatedTotal,
          finalPrice,
          priceStatus,
          status,
          `Special pickup request for ${wasteType.toLowerCase()}`,
          requestDate,
          requestDate, // Use request date as pickup date
          user.address // Use the user's VSM Heights address
        ]
      );
      
      totalSpecialPickups++;
    }
    
    console.log(`✅ Created ${totalSpecialPickups} realistic special pickup requests`);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 REALISTIC DATA POPULATION COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   👥 Users: ${createdUsers.length}`);
    console.log(`   💰 Payments: ${totalPayments}`);
    console.log(`   🚛 Collections: ${totalCollections}`);
    console.log(`   📦 Special Pickups: ${totalSpecialPickups}`);
    console.log('\n✅ Your reports should now show realistic business data!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error populating realistic data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the population script
if (require.main === module) {
  populateRealisticData()
    .then(() => {
      console.log('✅ Data population completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Data population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateRealisticData };
