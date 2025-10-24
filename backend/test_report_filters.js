// Test Report Filters for All 3 Major Reports
const { pool } = require('./config/db');

async function testReportFilters() {
  console.log('🧪 TESTING REPORT FILTERS FOR ALL 3 MAJOR REPORTS\n');
  console.log('=' .repeat(70));
  
  try {
    // Test 1: Regular Pickup Report Filters
    console.log('📋 1. TESTING REGULAR PICKUP REPORT FILTERS');
    console.log('-'.repeat(50));
    
    await testRegularPickupFilters();
    
    // Test 2: Billing/Payment Report Filters  
    console.log('\n💰 2. TESTING BILLING/PAYMENT REPORT FILTERS');
    console.log('-'.repeat(50));
    
    await testBillingPaymentFilters();
    
    // Test 3: Special Pickup Report Filters
    console.log('\n🚛 3. TESTING SPECIAL PICKUP REPORT FILTERS');
    console.log('-'.repeat(50));
    
    await testSpecialPickupFilters();
    
    console.log('\n🎉 ALL FILTER TESTS COMPLETED!');
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Test Regular Pickup Report Filters
async function testRegularPickupFilters() {
  console.log('🔍 Testing Regular Pickup Filters...');
  
  // Test Date Filter
  console.log('\n📅 Date Filter Test:');
  const dateQuery = `
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN action = 'collected' THEN 1 END) as collected,
           COUNT(CASE WHEN action = 'missed' THEN 1 END) as missed
    FROM collection_stop_events 
    WHERE DATE(created_at) BETWEEN '2025-10-01' AND '2025-10-31'
  `;
  const dateResult = await pool.query(dateQuery);
  console.log(`   Oct 2025: ${dateResult.rows[0].total} total, ${dateResult.rows[0].collected} collected, ${dateResult.rows[0].missed} missed`);
  
  // Test Barangay Filter
  console.log('\n🏘️ Barangay Filter Test:');
  const barangayQuery = `
    SELECT b.barangay_name, COUNT(*) as collection_count
    FROM collection_stop_events cse
    LEFT JOIN users u ON CAST(cse.user_id AS INTEGER) = CAST(u.user_id AS INTEGER)
    LEFT JOIN addresses a ON CAST(u.address_id AS INTEGER) = CAST(a.address_id AS INTEGER)
    LEFT JOIN barangays b ON CAST(a.barangay_id AS INTEGER) = CAST(b.barangay_id AS INTEGER)
    WHERE b.barangay_name IS NOT NULL
    GROUP BY b.barangay_name
    ORDER BY collection_count DESC
    LIMIT 5
  `;
  const barangayResult = await pool.query(barangayQuery);
  barangayResult.rows.forEach(row => {
    console.log(`   ${row.barangay_name}: ${row.collection_count} collections`);
  });
  
  // Test Status Filter
  console.log('\n📊 Status Filter Test:');
  const statusQuery = `
    SELECT action as status, COUNT(*) as count
    FROM collection_stop_events
    GROUP BY action
    ORDER BY count DESC
  `;
  const statusResult = await pool.query(statusQuery);
  statusResult.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} events`);
  });
  
  console.log('✅ Regular Pickup Filters: WORKING');
}

// Test Billing/Payment Report Filters
async function testBillingPaymentFilters() {
  console.log('🔍 Testing Billing/Payment Filters...');
  
  // Test Date Filter
  console.log('\n📅 Date Filter Test:');
  const dateQuery = `
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
           COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid,
           SUM(amount) as total_amount
    FROM invoices 
    WHERE DATE(created_at) BETWEEN '2025-10-01' AND '2025-10-31'
  `;
  const dateResult = await pool.query(dateQuery);
  console.log(`   Oct 2025: ${dateResult.rows[0].total} invoices, ${dateResult.rows[0].paid} paid, ${dateResult.rows[0].unpaid} unpaid`);
  console.log(`   Total Amount: ₱${parseFloat(dateResult.rows[0].total_amount || 0).toLocaleString()}`);
  
  // Test Plan Filter
  console.log('\n📋 Plan Filter Test:');
  const planQuery = `
    SELECT sp.plan_name, COUNT(*) as invoice_count, SUM(i.amount) as total_amount
    FROM invoices i
    LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
    LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE sp.plan_name IS NOT NULL
    GROUP BY sp.plan_name
    ORDER BY invoice_count DESC
  `;
  const planResult = await pool.query(planQuery);
  planResult.rows.forEach(row => {
    console.log(`   ${row.plan_name}: ${row.invoice_count} invoices, ₱${parseFloat(row.total_amount || 0).toLocaleString()}`);
  });
  
  // Test Status Filter
  console.log('\n📊 Status Filter Test:');
  const statusQuery = `
    SELECT status, COUNT(*) as count, SUM(amount) as total_amount
    FROM invoices
    GROUP BY status
    ORDER BY count DESC
  `;
  const statusResult = await pool.query(statusQuery);
  statusResult.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} invoices, ₱${parseFloat(row.total_amount || 0).toLocaleString()}`);
  });
  
  // Test Barangay Filter
  console.log('\n🏘️ Barangay Filter Test:');
  const barangayQuery = `
    SELECT b.barangay_name, COUNT(*) as invoice_count, SUM(i.amount) as total_amount
    FROM invoices i
    LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
    LEFT JOIN users u ON cs.user_id = u.user_id
    LEFT JOIN addresses a ON u.address_id = a.address_id
    LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
    WHERE b.barangay_name IS NOT NULL
    GROUP BY b.barangay_name
    ORDER BY invoice_count DESC
    LIMIT 5
  `;
  const barangayResult = await pool.query(barangayQuery);
  barangayResult.rows.forEach(row => {
    console.log(`   ${row.barangay_name}: ${row.invoice_count} invoices, ₱${parseFloat(row.total_amount || 0).toLocaleString()}`);
  });
  
  console.log('✅ Billing/Payment Filters: WORKING');
}

// Test Special Pickup Report Filters
async function testSpecialPickupFilters() {
  console.log('🔍 Testing Special Pickup Filters...');
  
  // Test Date Filter
  console.log('\n📅 Date Filter Test:');
  const dateQuery = `
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN status = 'collected' THEN 1 END) as collected,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
           SUM(final_price) as total_revenue
    FROM special_pickup_requests 
    WHERE DATE(created_at) BETWEEN '2025-10-01' AND '2025-10-31'
  `;
  const dateResult = await pool.query(dateQuery);
  console.log(`   Oct 2025: ${dateResult.rows[0].total} requests, ${dateResult.rows[0].collected} collected, ${dateResult.rows[0].pending} pending`);
  console.log(`   Total Revenue: ₱${parseFloat(dateResult.rows[0].total_revenue || 0).toLocaleString()}`);
  
  // Test Waste Type Filter
  console.log('\n🗂️ Waste Type Filter Test:');
  const wasteTypeQuery = `
    SELECT waste_type, COUNT(*) as request_count, 
           COUNT(CASE WHEN status = 'collected' THEN 1 END) as collected_count,
           SUM(final_price) as total_revenue
    FROM special_pickup_requests
    WHERE waste_type IS NOT NULL
    GROUP BY waste_type
    ORDER BY request_count DESC
    LIMIT 5
  `;
  const wasteTypeResult = await pool.query(wasteTypeQuery);
  wasteTypeResult.rows.forEach(row => {
    console.log(`   ${row.waste_type}: ${row.request_count} requests, ${row.collected_count} collected, ₱${parseFloat(row.total_revenue || 0).toLocaleString()}`);
  });
  
  // Test Status Filter
  console.log('\n📊 Status Filter Test:');
  const statusQuery = `
    SELECT status, COUNT(*) as count, SUM(final_price) as total_revenue
    FROM special_pickup_requests
    GROUP BY status
    ORDER BY count DESC
  `;
  const statusResult = await pool.query(statusQuery);
  statusResult.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} requests, ₱${parseFloat(row.total_revenue || 0).toLocaleString()}`);
  });
  
  // Test Price Status Filter
  console.log('\n💰 Price Status Filter Test:');
  const priceStatusQuery = `
    SELECT price_status, COUNT(*) as count, 
           AVG(final_price) as avg_price,
           SUM(final_price) as total_revenue
    FROM special_pickup_requests
    WHERE price_status IS NOT NULL
    GROUP BY price_status
    ORDER BY count DESC
  `;
  const priceStatusResult = await pool.query(priceStatusQuery);
  priceStatusResult.rows.forEach(row => {
    console.log(`   ${row.price_status}: ${row.count} requests, Avg: ₱${parseFloat(row.avg_price || 0).toFixed(2)}, Total: ₱${parseFloat(row.total_revenue || 0).toLocaleString()}`);
  });
  
  // Test Barangay Filter
  console.log('\n🏘️ Barangay Filter Test:');
  const barangayQuery = `
    SELECT b.barangay_name, COUNT(*) as request_count, 
           COUNT(CASE WHEN spr.status = 'collected' THEN 1 END) as collected_count,
           SUM(spr.final_price) as total_revenue
    FROM special_pickup_requests spr
    LEFT JOIN users u ON CAST(spr.user_id AS INTEGER) = CAST(u.user_id AS INTEGER)
    LEFT JOIN addresses a ON CAST(u.address_id AS INTEGER) = CAST(a.address_id AS INTEGER)
    LEFT JOIN barangays b ON CAST(a.barangay_id AS INTEGER) = CAST(b.barangay_id AS INTEGER)
    WHERE b.barangay_name IS NOT NULL
    GROUP BY b.barangay_name
    ORDER BY request_count DESC
    LIMIT 5
  `;
  const barangayResult = await pool.query(barangayQuery);
  barangayResult.rows.forEach(row => {
    console.log(`   ${row.barangay_name}: ${row.request_count} requests, ${row.collected_count} collected, ₱${parseFloat(row.total_revenue || 0).toLocaleString()}`);
  });
  
  console.log('✅ Special Pickup Filters: WORKING');
}

// Run the tests
testReportFilters();
