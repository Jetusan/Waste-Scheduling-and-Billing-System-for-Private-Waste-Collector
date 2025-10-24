// Test Complete Report Flow: Filters → Preview → PDF Download
const { pool } = require('./config/db');
const ReportController = require('./controller/reportController');

async function testCompleteReportFlow() {
  console.log('🧪 TESTING COMPLETE REPORT FLOW: FILTERS → PREVIEW → PDF\n');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: Regular Pickup Report - Complete Flow
    console.log('📋 1. REGULAR PICKUP REPORT - COMPLETE FLOW TEST');
    console.log('-'.repeat(60));
    
    await testRegularPickupFlow();
    
    // Test 2: Billing/Payment Report - Complete Flow
    console.log('\n💰 2. BILLING/PAYMENT REPORT - COMPLETE FLOW TEST');
    console.log('-'.repeat(60));
    
    await testBillingReportFlow();
    
    // Test 3: Special Pickup Report - Complete Flow
    console.log('\n🚛 3. SPECIAL PICKUP REPORT - COMPLETE FLOW TEST');
    console.log('-'.repeat(60));
    
    await testSpecialPickupFlow();
    
    console.log('\n🎉 ALL REPORT FLOW TESTS COMPLETED!');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Test Regular Pickup Report Flow
async function testRegularPickupFlow() {
  console.log('🔍 Testing Regular Pickup Report Flow...');
  
  // Step 1: Generate report with filters (simulates admin panel)
  const filters = {
    barangay: '1', // City Heights
    status: 'collected'
  };
  const startDate = '2025-10-01';
  const endDate = '2025-10-31';
  
  console.log(`📊 Step 1: Generate report with filters`);
  console.log(`   Filters: ${JSON.stringify(filters)}`);
  console.log(`   Date Range: ${startDate} to ${endDate}`);
  
  const reportData = await ReportController.generateWasteCollectionReport(filters, startDate, endDate);
  
  console.log(`✅ Report Generated:`);
  console.log(`   Collections Found: ${reportData.collections.length}`);
  console.log(`   Completed: ${reportData.summary.completed}`);
  console.log(`   Completion Rate: ${reportData.summary.completionRate}%`);
  
  // Verify filters were applied correctly
  const allCollected = reportData.collections.every(c => c.status === 'collected');
  const allCityHeights = reportData.collections.every(c => c.barangay_name === 'City Heights');
  
  console.log(`   ✅ Status Filter Applied: ${allCollected}`);
  console.log(`   ✅ Barangay Filter Applied: ${allCityHeights}`);
  
  // Step 2: Simulate PDF generation (what happens when user clicks "Download PDF")
  console.log(`\n📄 Step 2: Generate PDF with same data`);
  
  const pdfReportData = {
    type: 'regular-pickup',
    generated_by: 'Admin User',
    date: new Date().toISOString(),
    period: 'monthly',
    data: reportData,
    report_id: 'TEST-REG-001',
    start_date: startDate,
    end_date: endDate,
    status: 'completed'
  };
  
  const htmlContent = ReportController.generateReportHTML(pdfReportData);
  
  // Verify PDF content matches report data
  const htmlContainsCollections = htmlContent.includes('Collection Schedule Details');
  const htmlContainsWasteBreakdown = htmlContent.includes('Waste Type Breakdown');
  const htmlContainsCorrectCount = htmlContent.includes(`${reportData.collections.length}`);
  
  console.log(`   ✅ PDF Contains Collections Table: ${htmlContainsCollections}`);
  console.log(`   ✅ PDF Contains Waste Breakdown: ${htmlContainsWasteBreakdown}`);
  console.log(`   ✅ PDF Shows Correct Count: ${htmlContainsCorrectCount}`);
  
  // Check for errors in PDF
  const hasObjectError = htmlContent.includes('[object Object]');
  const hasNaNError = htmlContent.includes('NaN%');
  
  console.log(`   ✅ No [object Object] errors: ${!hasObjectError}`);
  console.log(`   ✅ No NaN% errors: ${!hasNaNError}`);
  
  if (hasObjectError || hasNaNError) {
    console.log(`   ❌ PDF GENERATION ISSUES FOUND!`);
    if (hasObjectError) {
      const objectIndex = htmlContent.indexOf('[object Object]');
      const context = htmlContent.substring(Math.max(0, objectIndex - 50), objectIndex + 50);
      console.log(`      [object Object] context: ...${context}...`);
    }
    if (hasNaNError) {
      const nanIndex = htmlContent.indexOf('NaN%');
      const context = htmlContent.substring(Math.max(0, nanIndex - 50), nanIndex + 50);
      console.log(`      NaN% context: ...${context}...`);
    }
  }
  
  console.log(`🎯 Regular Pickup Flow: ${(!hasObjectError && !hasNaNError) ? 'PASSED' : 'FAILED'}`);
}

// Test Billing/Payment Report Flow
async function testBillingReportFlow() {
  console.log('🔍 Testing Billing/Payment Report Flow...');
  
  // Step 1: Generate report with filters
  const filters = {
    status: 'paid',
    plan: 'Full Plan'
  };
  const startDate = '2025-10-01';
  const endDate = '2025-10-31';
  
  console.log(`📊 Step 1: Generate billing report with filters`);
  console.log(`   Filters: ${JSON.stringify(filters)}`);
  console.log(`   Date Range: ${startDate} to ${endDate}`);
  
  const reportData = await ReportController.generateFinancialReport(filters, startDate, endDate);
  
  console.log(`✅ Report Generated:`);
  console.log(`   Invoices Found: ${reportData.invoices.length}`);
  console.log(`   Total Amount: ₱${reportData.summary.totalAmount.toLocaleString()}`);
  console.log(`   Collection Rate: ${reportData.summary.collectionRate}%`);
  
  // Verify filters were applied correctly
  const allPaid = reportData.invoices.every(i => i.invoice_status === 'paid');
  const allFullPlan = reportData.invoices.every(i => i.plan_name === 'Full Plan');
  
  console.log(`   ✅ Status Filter Applied: ${allPaid}`);
  console.log(`   ✅ Plan Filter Applied: ${allFullPlan}`);
  
  // Step 2: Generate PDF
  console.log(`\n📄 Step 2: Generate PDF with same data`);
  
  const pdfReportData = {
    type: 'billing-payment',
    generated_by: 'Admin User',
    date: new Date().toISOString(),
    period: 'monthly',
    data: reportData,
    report_id: 'TEST-BILL-001',
    start_date: startDate,
    end_date: endDate,
    status: 'completed'
  };
  
  const htmlContent = ReportController.generateReportHTML(pdfReportData);
  
  // Verify PDF content
  const htmlContainsInvoices = htmlContent.includes('Invoice Details');
  const htmlContainsCorrectAmount = htmlContent.includes(`₱${reportData.summary.totalAmount.toLocaleString()}`);
  
  console.log(`   ✅ PDF Contains Invoice Table: ${htmlContainsInvoices}`);
  console.log(`   ✅ PDF Shows Correct Amount: ${htmlContainsCorrectAmount}`);
  
  // Check for errors
  const hasObjectError = htmlContent.includes('[object Object]');
  const hasNaNError = htmlContent.includes('NaN%');
  
  console.log(`   ✅ No [object Object] errors: ${!hasObjectError}`);
  console.log(`   ✅ No NaN% errors: ${!hasNaNError}`);
  
  console.log(`🎯 Billing Report Flow: ${(!hasObjectError && !hasNaNError) ? 'PASSED' : 'FAILED'}`);
}

// Test Special Pickup Report Flow
async function testSpecialPickupFlow() {
  console.log('🔍 Testing Special Pickup Report Flow...');
  
  // Step 1: Generate report with filters
  const filters = {
    wasteType: 'Electronics',
    status: 'collected'
  };
  const startDate = '2024-01-01'; // Broader range to include collected items
  const endDate = '2025-12-31';
  
  console.log(`📊 Step 1: Generate special pickup report with filters`);
  console.log(`   Filters: ${JSON.stringify(filters)}`);
  console.log(`   Date Range: ${startDate} to ${endDate}`);
  
  const reportData = await ReportController.generateSpecialPickupsReport(filters, startDate, endDate);
  
  console.log(`✅ Report Generated:`);
  console.log(`   Requests Found: ${reportData.pickups.length}`);
  console.log(`   Completed: ${reportData.summary.collected}`);
  console.log(`   Total Revenue: ₱${reportData.summary.totalRevenue.toLocaleString()}`);
  
  // Verify filters were applied correctly
  const allElectronics = reportData.pickups.every(p => p.waste_type === 'Electronics');
  const allCollected = reportData.pickups.every(p => p.status === 'collected');
  
  console.log(`   ✅ Waste Type Filter Applied: ${allElectronics}`);
  console.log(`   ✅ Status Filter Applied: ${allCollected}`);
  
  // Step 2: Generate PDF
  console.log(`\n📄 Step 2: Generate PDF with same data`);
  
  const pdfReportData = {
    type: 'special-pickup',
    generated_by: 'Admin User',
    date: new Date().toISOString(),
    period: 'custom',
    data: reportData,
    report_id: 'TEST-SPEC-001',
    start_date: startDate,
    end_date: endDate,
    status: 'completed'
  };
  
  const htmlContent = ReportController.generateReportHTML(pdfReportData);
  
  // Verify PDF content
  const htmlContainsPickups = htmlContent.includes('Special Pickup Details');
  const htmlContainsWasteBreakdown = htmlContent.includes('Waste Type Breakdown');
  const htmlContainsCorrectRevenue = htmlContent.includes(`₱${reportData.summary.totalRevenue.toLocaleString()}`);
  
  console.log(`   ✅ PDF Contains Pickup Table: ${htmlContainsPickups}`);
  console.log(`   ✅ PDF Contains Waste Breakdown: ${htmlContainsWasteBreakdown}`);
  console.log(`   ✅ PDF Shows Correct Revenue: ${htmlContainsCorrectRevenue}`);
  
  // Check for errors
  const hasObjectError = htmlContent.includes('[object Object]');
  const hasNaNError = htmlContent.includes('NaN%');
  
  console.log(`   ✅ No [object Object] errors: ${!hasObjectError}`);
  console.log(`   ✅ No NaN% errors: ${!hasNaNError}`);
  
  // Special check for waste type breakdown data structure
  if (reportData.summary && reportData.summary.wasteTypeBreakdown) {
    console.log(`   ✅ Waste Type Breakdown Data Available: true`);
    
    // Test the breakdown structure
    Object.entries(reportData.summary.wasteTypeBreakdown).forEach(([type, breakdown]) => {
      const hasValidStructure = breakdown.totalRequests !== undefined && 
                               breakdown.completed !== undefined && 
                               breakdown.completionRate !== undefined;
      console.log(`      ${type}: Valid Structure = ${hasValidStructure}`);
    });
  } else {
    console.log(`   ❌ Waste Type Breakdown Data Missing`);
  }
  
  console.log(`🎯 Special Pickup Flow: ${(!hasObjectError && !hasNaNError) ? 'PASSED' : 'FAILED'}`);
}

// Run the complete flow test
testCompleteReportFlow();
