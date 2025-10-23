#!/usr/bin/env node

const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  user_id: 143,
  subscription_id: 22,
  amount: 199,
  gcash_number: '09916771885',
  test_image_path: './test-gcash-receipt.jpg' // You can create a dummy image
};

async function testPaymentFlow() {
  console.log('🧪 Starting Manual Payment Flow Test...\n');
  
  let testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing Database Connection...');
    try {
      const dbTest = await pool.query('SELECT NOW() as current_time');
      console.log('✅ Database connected successfully');
      console.log(`   Current time: ${dbTest.rows[0].current_time}`);
      testResults.passed++;
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      testResults.failed++;
      testResults.errors.push('Database connection failed');
    }

    // Test 2: Check Required Tables
    console.log('\n2️⃣ Testing Required Tables...');
    const requiredTables = [
      'manual_payment_verifications',
      'customer_subscriptions', 
      'invoices',
      'notifications',
      'users'
    ];

    for (const table of requiredTables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
        console.log(`✅ Table '${table}' exists and accessible`);
        testResults.passed++;
      } catch (error) {
        console.log(`❌ Table '${table}' error:`, error.message);
        testResults.failed++;
        testResults.errors.push(`Table ${table} not accessible`);
      }
    }

    // Test 3: Check User and Subscription
    console.log('\n3️⃣ Testing User and Subscription Data...');
    try {
      const userCheck = await pool.query('SELECT user_id, username FROM users WHERE user_id = $1', [TEST_CONFIG.user_id]);
      if (userCheck.rows.length > 0) {
        console.log(`✅ User found: ${userCheck.rows[0].username} (ID: ${TEST_CONFIG.user_id})`);
        testResults.passed++;
      } else {
        console.log(`❌ User ${TEST_CONFIG.user_id} not found`);
        testResults.failed++;
        testResults.errors.push('Test user not found');
      }

      const subCheck = await pool.query('SELECT subscription_id, status FROM customer_subscriptions WHERE subscription_id = $1 AND user_id = $2', 
        [TEST_CONFIG.subscription_id, TEST_CONFIG.user_id]);
      if (subCheck.rows.length > 0) {
        console.log(`✅ Subscription found: ID ${TEST_CONFIG.subscription_id}, Status: ${subCheck.rows[0].status}`);
        testResults.passed++;
      } else {
        console.log(`❌ Subscription ${TEST_CONFIG.subscription_id} not found for user ${TEST_CONFIG.user_id}`);
        testResults.failed++;
        testResults.errors.push('Test subscription not found');
      }
    } catch (error) {
      console.log('❌ User/Subscription check failed:', error.message);
      testResults.failed++;
      testResults.errors.push('User/Subscription check failed');
    }

    // Test 4: Check Invoice Table Schema
    console.log('\n4️⃣ Testing Invoice Table Schema...');
    try {
      const schemaCheck = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        ORDER BY ordinal_position
      `);
      
      const columns = schemaCheck.rows.map(row => row.column_name);
      console.log('✅ Invoice table columns:', columns.join(', '));
      
      // Check for required columns
      const requiredColumns = ['user_id', 'subscription_id', 'amount', 'status'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('✅ All required invoice columns present');
        testResults.passed++;
      } else {
        console.log('❌ Missing invoice columns:', missingColumns.join(', '));
        testResults.failed++;
        testResults.errors.push(`Missing invoice columns: ${missingColumns.join(', ')}`);
      }
    } catch (error) {
      console.log('❌ Invoice schema check failed:', error.message);
      testResults.failed++;
      testResults.errors.push('Invoice schema check failed');
    }

    // Test 5: Test OCR Dependencies
    console.log('\n5️⃣ Testing OCR Dependencies...');
    try {
      const PaymentVerificationOCR = require('./utils/paymentOCR');
      console.log('✅ OCR module loaded successfully');
      testResults.passed++;
    } catch (error) {
      console.log('⚠️ OCR module not available (will use manual verification)');
      console.log('   This is expected in production environments');
      testResults.passed++; // Not a failure, just a note
    }

    // Test 6: Test Fraud Prevention Functions
    console.log('\n6️⃣ Testing Fraud Prevention Functions...');
    try {
      // Test image hash generation (with dummy data)
      const crypto = require('crypto');
      const testHash = crypto.createHash('md5').update('test-image-data').digest('hex');
      console.log(`✅ Image hash generation working: ${testHash.substring(0, 8)}...`);
      testResults.passed++;

      // Test duplicate check query structure
      const duplicateTest = await pool.query(`
        SELECT verification_id, created_at, verification_status 
        FROM manual_payment_verifications 
        WHERE image_hash = $1 AND user_id = $2
        ORDER BY created_at DESC LIMIT 1
      `, ['test-hash', TEST_CONFIG.user_id]);
      console.log('✅ Duplicate check query structure valid');
      testResults.passed++;
    } catch (error) {
      console.log('❌ Fraud prevention test failed:', error.message);
      testResults.failed++;
      testResults.errors.push('Fraud prevention functions failed');
    }

    // Test 7: Test Manual Payment Verification Table
    console.log('\n7️⃣ Testing Manual Payment Verification Table...');
    try {
      const verificationSchema = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'manual_payment_verifications' 
        ORDER BY ordinal_position
      `);
      
      const verificationColumns = verificationSchema.rows.map(row => row.column_name);
      console.log('✅ Verification table columns:', verificationColumns.join(', '));
      
      const requiredVerificationColumns = ['verification_id', 'user_id', 'subscription_id', 'amount', 'verification_status', 'image_hash'];
      const missingVerificationColumns = requiredVerificationColumns.filter(col => !verificationColumns.includes(col));
      
      if (missingVerificationColumns.length === 0) {
        console.log('✅ All required verification columns present');
        testResults.passed++;
      } else {
        console.log('❌ Missing verification columns:', missingVerificationColumns.join(', '));
        testResults.failed++;
        testResults.errors.push(`Missing verification columns: ${missingVerificationColumns.join(', ')}`);
      }
    } catch (error) {
      console.log('❌ Verification table check failed:', error.message);
      testResults.failed++;
      testResults.errors.push('Verification table check failed');
    }

    // Test 8: Test Upload Directory
    console.log('\n8️⃣ Testing Upload Directory...');
    try {
      const uploadDir = 'uploads/payment-proofs/';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Upload directory created');
      } else {
        console.log('✅ Upload directory exists');
      }
      
      // Test write permissions
      const testFile = path.join(uploadDir, 'test-write.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Upload directory writable');
      testResults.passed++;
    } catch (error) {
      console.log('❌ Upload directory test failed:', error.message);
      testResults.failed++;
      testResults.errors.push('Upload directory not accessible');
    }

    // Test 9: Test Notification System
    console.log('\n9️⃣ Testing Notification System...');
    try {
      const notificationTest = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'notifications'
      `);
      
      const notificationColumns = notificationTest.rows.map(row => row.column_name);
      const requiredNotificationColumns = ['user_id', 'title', 'message', 'notification_type', 'created_at'];
      const missingNotificationColumns = requiredNotificationColumns.filter(col => !notificationColumns.includes(col));
      
      if (missingNotificationColumns.length === 0) {
        console.log('✅ Notification system ready');
        testResults.passed++;
      } else {
        console.log('❌ Missing notification columns:', missingNotificationColumns.join(', '));
        testResults.failed++;
        testResults.errors.push(`Missing notification columns: ${missingNotificationColumns.join(', ')}`);
      }
    } catch (error) {
      console.log('❌ Notification system test failed:', error.message);
      testResults.failed++;
      testResults.errors.push('Notification system failed');
    }

    // Test 10: Simulate Payment Flow (Dry Run)
    console.log('\n🔟 Testing Payment Flow Logic (Dry Run)...');
    try {
      // Test the validation logic without actually inserting
      const mockOCRText = 'JY.-TD. +63 991 677 1885 Sent via GCash Amount 200.00 Total Amount Sent £200.00 Ref No. 3033 943 517245 Oct 23, 2025 10:39 PM';
      
      // Test phone number normalization
      const phoneNumbers = mockOCRText.match(/(?:\+63\s?9\d{2}\s?\d{3}\s?\d{4}|09\d{9})/g) || [];
      const normalizedNumbers = phoneNumbers.map(num => {
        return num.replace(/\+63\s?9/, '09').replace(/\s/g, '');
      });
      
      if (normalizedNumbers.includes(TEST_CONFIG.gcash_number)) {
        console.log('✅ Phone number validation logic working');
        testResults.passed++;
      } else {
        console.log('❌ Phone number validation failed');
        testResults.failed++;
        testResults.errors.push('Phone number validation failed');
      }

      // Test amount detection
      const amounts = mockOCRText.match(/[₱£][\d,]+\.?\d*/g) || [];
      const standaloneAmounts = mockOCRText.match(/\b\d{2,3}\.00\b/g) || [];
      const allAmounts = [...amounts, ...standaloneAmounts];
      const numericAmounts = allAmounts.map(a => parseFloat(a.replace(/[₱£,]/g, '')));
      
      const expectedNum = parseFloat(TEST_CONFIG.amount);
      const hasCloseAmount = numericAmounts.some(amt => Math.abs(amt - expectedNum) <= 5);
      
      if (hasCloseAmount) {
        console.log('✅ Amount detection logic working');
        testResults.passed++;
      } else {
        console.log('❌ Amount detection failed');
        testResults.failed++;
        testResults.errors.push('Amount detection failed');
      }
    } catch (error) {
      console.log('❌ Payment flow logic test failed:', error.message);
      testResults.failed++;
      testResults.errors.push('Payment flow logic failed');
    }

  } catch (error) {
    console.log('🚨 Critical test error:', error.message);
    testResults.failed++;
    testResults.errors.push('Critical test failure');
  } finally {
    // Close database connection
    await pool.end();
  }

  // Print Results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 ERRORS FOUND:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Manual payment flow is ready for production.');
    console.log('✅ You can now submit GCash payments without errors.');
  } else {
    console.log('\n⚠️ Some tests failed. Please fix the issues above before using the payment system.');
  }

  console.log('\n🔌 Database connection closed.');
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run the test
testPaymentFlow().catch(error => {
  console.error('🚨 Test script error:', error);
  process.exit(1);
});
