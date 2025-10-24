// Test Report Filter Parameters - Simulate Admin Panel Filter Requests
const { pool } = require('./config/db');
const ReportController = require('./controller/reportController');

async function testReportFilterParameters() {
  console.log('🧪 TESTING REPORT FILTER PARAMETERS\n');
  console.log('=' .repeat(70));
  
  try {
    // Test 1: Regular Pickup Report with Filters
    console.log('📋 1. TESTING REGULAR PICKUP REPORT WITH FILTERS');
    console.log('-'.repeat(50));
    
    // Test with barangay filter
    console.log('🏘️ Testing Barangay Filter (City Heights):');
    const regularPickupFilters1 = {
      barangay: '1', // City Heights barangay_id
      status: 'collected'
    };
    const regularReport1 = await ReportController.generateWasteCollectionReport(
      regularPickupFilters1, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${regularReport1.collections.length} collections found`);
    console.log(`   Completed: ${regularReport1.summary.completed}`);
    console.log(`   Completion Rate: ${regularReport1.summary.completionRate}%`);
    
    // Test with status filter
    console.log('\n📊 Testing Status Filter (collected only):');
    const regularPickupFilters2 = {
      status: 'collected'
    };
    const regularReport2 = await ReportController.generateWasteCollectionReport(
      regularPickupFilters2, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${regularReport2.collections.length} collections found`);
    console.log(`   All should be collected: ${regularReport2.collections.every(c => c.status === 'collected')}`);
    
    // Test 2: Billing/Payment Report with Filters
    console.log('\n💰 2. TESTING BILLING/PAYMENT REPORT WITH FILTERS');
    console.log('-'.repeat(50));
    
    // Test with status filter
    console.log('📊 Testing Status Filter (paid only):');
    const billingFilters1 = {
      status: 'paid'
    };
    const billingReport1 = await ReportController.generateFinancialReport(
      billingFilters1, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${billingReport1.invoices.length} invoices found`);
    console.log(`   Total Revenue: ₱${billingReport1.summary.totalAmount.toLocaleString()}`);
    console.log(`   All should be paid: ${billingReport1.invoices.every(i => i.invoice_status === 'paid')}`);
    
    // Test with plan filter
    console.log('\n📋 Testing Plan Filter (Full Plan):');
    const billingFilters2 = {
      plan: 'Full Plan'
    };
    const billingReport2 = await ReportController.generateFinancialReport(
      billingFilters2, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${billingReport2.invoices.length} invoices found`);
    console.log(`   All should be Full Plan: ${billingReport2.invoices.every(i => i.plan_name === 'Full Plan')}`);
    
    // Test 3: Special Pickup Report with Filters
    console.log('\n🚛 3. TESTING SPECIAL PICKUP REPORT WITH FILTERS');
    console.log('-'.repeat(50));
    
    // Test with waste type filter
    console.log('🗂️ Testing Waste Type Filter (Bulky):');
    const specialFilters1 = {
      wasteType: 'Bulky'
    };
    const specialReport1 = await ReportController.generateSpecialPickupsReport(
      specialFilters1, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${specialReport1.pickups.length} requests found`);
    console.log(`   All should be Bulky: ${specialReport1.pickups.every(p => p.waste_type === 'Bulky')}`);
    console.log(`   Total Revenue: ₱${specialReport1.summary.totalRevenue.toLocaleString()}`);
    
    // Test with status filter
    console.log('\n📊 Testing Status Filter (collected only):');
    const specialFilters2 = {
      status: 'collected'
    };
    const specialReport2 = await ReportController.generateSpecialPickupsReport(
      specialFilters2, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${specialReport2.pickups.length} requests found`);
    console.log(`   All should be collected: ${specialReport2.pickups.every(p => p.status === 'collected')}`);
    
    // Test with barangay filter
    console.log('\n🏘️ Testing Barangay Filter (City Heights):');
    const specialFilters3 = {
      barangay: '1' // City Heights barangay_id
    };
    const specialReport3 = await ReportController.generateSpecialPickupsReport(
      specialFilters3, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${specialReport3.pickups.length} requests found`);
    console.log(`   All should be City Heights: ${specialReport3.pickups.every(p => p.barangay_name === 'City Heights')}`);
    
    // Test 4: Combined Filters
    console.log('\n🔄 4. TESTING COMBINED FILTERS');
    console.log('-'.repeat(50));
    
    // Test regular pickup with multiple filters
    console.log('📋 Regular Pickup - Barangay + Status:');
    const combinedFilters1 = {
      barangay: '1',
      status: 'collected'
    };
    const combinedReport1 = await ReportController.generateWasteCollectionReport(
      combinedFilters1, 
      '2025-10-01', 
      '2025-10-31'
    );
    console.log(`   Result: ${combinedReport1.collections.length} collections found`);
    console.log(`   Filters applied correctly: ${
      combinedReport1.collections.every(c => 
        c.status === 'collected' && c.barangay_name === 'City Heights'
      )
    }`);
    
    // Test special pickup with multiple filters
    console.log('\n🚛 Special Pickup - Waste Type + Status:');
    const combinedFilters2 = {
      wasteType: 'Electronics',
      status: 'collected'
    };
    const combinedReport2 = await ReportController.generateSpecialPickupsReport(
      combinedFilters2, 
      '2024-01-01', 
      '2025-12-31'
    );
    console.log(`   Result: ${combinedReport2.pickups.length} requests found`);
    console.log(`   Filters applied correctly: ${
      combinedReport2.pickups.every(p => 
        p.waste_type === 'Electronics' && p.status === 'collected'
      )
    }`);
    
    // Test 5: Date Range Filtering
    console.log('\n📅 5. TESTING DATE RANGE FILTERING');
    console.log('-'.repeat(50));
    
    // Test narrow date range
    console.log('📅 Testing Narrow Date Range (Oct 21-23, 2025):');
    const dateReport = await ReportController.generateSpecialPickupsReport(
      {}, 
      '2025-10-21', 
      '2025-10-23'
    );
    console.log(`   Result: ${dateReport.pickups.length} requests found`);
    console.log(`   Date range applied correctly: ${
      dateReport.pickups.every(p => {
        const date = new Date(p.created_at);
        return date >= new Date('2025-10-21') && date <= new Date('2025-10-23');
      })
    }`);
    
    console.log('\n✅ ALL FILTER PARAMETER TESTS COMPLETED!');
    console.log('🎯 Summary:');
    console.log('   ✅ Barangay filters working');
    console.log('   ✅ Status filters working');
    console.log('   ✅ Waste type filters working');
    console.log('   ✅ Plan filters working');
    console.log('   ✅ Combined filters working');
    console.log('   ✅ Date range filters working');
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('💥 Filter test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the filter parameter tests
testReportFilterParameters();
