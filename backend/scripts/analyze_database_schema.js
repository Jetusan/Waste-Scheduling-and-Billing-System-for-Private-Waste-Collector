// analyze_database_schema.js
const { pool } = require('../config/db');

async function analyzeSubscriptionSchema() {
  console.log('🔍 Analyzing Database Schema for Subscription Lifecycle\n');
  console.log('=' .repeat(60));

  try {
    // Get all tables
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('\n📋 Existing Tables:');
    existingTables.forEach(table => console.log(`   ✅ ${table}`));
    
    // Required tables for subscription lifecycle
    const requiredTables = [
      'customer_subscriptions',
      'subscription_plans', 
      'invoices',
      'users'
    ];
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing Required Tables:');
      missingTables.forEach(table => console.log(`   ❌ ${table}`));
      return;
    }
    
    console.log('\n✅ All required tables exist!');
    
    // Check customer_subscriptions table structure
    console.log('\n📊 Analyzing customer_subscriptions table...');
    const subscriptionsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customer_subscriptions'
      ORDER BY ordinal_position;
    `;
    
    const subscriptionsResult = await pool.query(subscriptionsQuery);
    const existingColumns = subscriptionsResult.rows.map(row => row.column_name);
    
    console.log('\nExisting columns:');
    subscriptionsResult.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'required'}`);
    });
    
    // Required columns for lifecycle management
    const requiredLifecycleColumns = [
      { name: 'payment_status', type: 'VARCHAR(20)', nullable: true, default: "'pending'" },
      { name: 'payment_confirmed_at', type: 'TIMESTAMP', nullable: true, default: null },
      { name: 'subscription_created_at', type: 'TIMESTAMP', nullable: true, default: 'CURRENT_TIMESTAMP' },
      { name: 'last_payment_date', type: 'DATE', nullable: true, default: null },
      { name: 'next_billing_date', type: 'DATE', nullable: true, default: null },
      { name: 'grace_period_end', type: 'DATE', nullable: true, default: null },
      { name: 'suspended_at', type: 'TIMESTAMP', nullable: true, default: null },
      { name: 'cancelled_at', type: 'TIMESTAMP', nullable: true, default: null },
      { name: 'cancellation_reason', type: 'TEXT', nullable: true, default: null },
      { name: 'reactivated_at', type: 'TIMESTAMP', nullable: true, default: null },
      { name: 'billing_cycle_count', type: 'INTEGER', nullable: true, default: '0' }
    ];
    
    const missingColumns = requiredLifecycleColumns.filter(col => 
      !existingColumns.includes(col.name)
    );
    
    console.log('\n📋 Lifecycle Column Analysis:');
    if (missingColumns.length > 0) {
      console.log('\n❌ Missing Lifecycle Columns:');
      missingColumns.forEach(col => {
        console.log(`   ❌ ${col.name} (${col.type}) - ${col.nullable ? 'nullable' : 'required'}`);
      });
    } else {
      console.log('\n✅ All lifecycle columns are present!');
    }
    
    // Check invoices table
    console.log('\n📊 Analyzing invoices table...');
    const invoicesQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position;
    `;
    
    const invoicesResult = await pool.query(invoicesQuery);
    const invoiceColumns = invoicesResult.rows.map(row => row.column_name);
    
    const requiredInvoiceColumns = ['subscription_id', 'user_id', 'status', 'due_date', 'amount'];
    const missingInvoiceColumns = requiredInvoiceColumns.filter(col => !invoiceColumns.includes(col));
    
    if (missingInvoiceColumns.length > 0) {
      console.log('\n❌ Missing Invoice Columns:');
      missingInvoiceColumns.forEach(col => console.log(`   ❌ ${col}`));
    } else {
      console.log('\n✅ Invoice table has required columns!');
    }
    
    // Generate migration recommendations
    console.log('\n\n🔧 MIGRATION RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    
    if (missingColumns.length > 0) {
      console.log('\n📝 Required ALTER TABLE statements:');
      missingColumns.forEach(col => {
        const nullable = col.nullable ? '' : ' NOT NULL';
        const defaultValue = col.default ? ` DEFAULT ${col.default}` : '';
        console.log(`ALTER TABLE customer_subscriptions ADD COLUMN ${col.name} ${col.type}${nullable}${defaultValue};`);
      });
    }
    
    if (missingInvoiceColumns.length > 0) {
      console.log('\n📝 Invoice table fixes needed:');
      missingInvoiceColumns.forEach(col => {
        console.log(`   - Add ${col} column to invoices table`);
      });
    }
    
    // Summary
    console.log('\n\n📊 SCHEMA ANALYSIS SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`✅ Required tables: ${requiredTables.length - missingTables.length}/${requiredTables.length}`);
    console.log(`✅ Lifecycle columns: ${requiredLifecycleColumns.length - missingColumns.length}/${requiredLifecycleColumns.length}`);
    console.log(`✅ Invoice columns: ${requiredInvoiceColumns.length - missingInvoiceColumns.length}/${requiredInvoiceColumns.length}`);
    
    const readyForImplementation = missingTables.length === 0 && missingColumns.length === 0 && missingInvoiceColumns.length === 0;
    
    if (readyForImplementation) {
      console.log('\n🎉 DATABASE IS READY FOR SUBSCRIPTION LIFECYCLE!');
    } else {
      console.log('\n⚠️  DATABASE MIGRATION REQUIRED BEFORE IMPLEMENTATION');
    }
    
    return {
      tablesReady: missingTables.length === 0,
      columnsReady: missingColumns.length === 0,
      invoicesReady: missingInvoiceColumns.length === 0,
      missingColumns,
      missingTables,
      missingInvoiceColumns
    };
    
  } catch (error) {
    console.error('❌ Error analyzing schema:', error.message);
    return null;
  } finally {
    await pool.end();
  }
}

analyzeSubscriptionSchema();
