// Debug Payment History and Report Issues
const { pool } = require('./config/db');

async function debugPaymentHistory() {
  console.log('🔍 DEBUGGING PAYMENT HISTORY & REPORTS\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check if payments table has data
    console.log('💰 1. CHECKING PAYMENTS TABLE');
    console.log('-'.repeat(40));
    
    const paymentsExistQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payments'
      );
    `;
    
    const paymentsExist = await pool.query(paymentsExistQuery);
    console.log(`Payments table exists: ${paymentsExist.rows[0].exists}`);
    
    if (paymentsExist.rows[0].exists) {
      const paymentsCountQuery = 'SELECT COUNT(*) as total FROM payments';
      const paymentsCount = await pool.query(paymentsCountQuery);
      console.log(`Total payments in database: ${paymentsCount.rows[0].total}`);
      
      if (paymentsCount.rows[0].total > 0) {
        const samplePaymentsQuery = `
          SELECT payment_id, amount, payment_method, payment_date, invoice_id
          FROM payments 
          ORDER BY payment_date DESC 
          LIMIT 5
        `;
        const samplePayments = await pool.query(samplePaymentsQuery);
        
        console.log('\n📋 SAMPLE PAYMENTS:');
        samplePayments.rows.forEach(payment => {
          console.log(`   ID: ${payment.payment_id} | Amount: ₱${payment.amount} | Method: ${payment.payment_method}`);
          console.log(`   Date: ${payment.payment_date} | Invoice: ${payment.invoice_id}`);
          console.log('');
        });
      } else {
        console.log('\n⚠️ No payments found in database');
        console.log('   This explains why Payment History is empty');
      }
    } else {
      console.log('\n❌ Payments table does not exist!');
      console.log('   Need to create payments table or use invoices table');
    }
    
    // 2. Check invoices table as alternative
    console.log('\n📄 2. CHECKING INVOICES TABLE (ALTERNATIVE)');
    console.log('-'.repeat(40));
    
    const invoicesCountQuery = 'SELECT COUNT(*) as total FROM invoices';
    const invoicesCount = await pool.query(invoicesCountQuery);
    console.log(`Total invoices in database: ${invoicesCount.rows[0].total}`);
    
    if (invoicesCount.rows[0].total > 0) {
      const sampleInvoicesQuery = `
        SELECT 
          i.invoice_id,
          i.invoice_number,
          i.amount,
          i.status,
          i.due_date,
          i.created_at,
          cs.user_id,
          u.username,
          sp.plan_name
        FROM invoices i
        LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        LEFT JOIN users u ON cs.user_id = u.user_id
        LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        ORDER BY i.created_at DESC 
        LIMIT 5
      `;
      const sampleInvoices = await pool.query(sampleInvoicesQuery);
      
      console.log('\n📋 SAMPLE INVOICES:');
      sampleInvoices.rows.forEach(invoice => {
        console.log(`   Invoice: ${invoice.invoice_number} | Amount: ₱${invoice.amount} | Status: ${invoice.status}`);
        console.log(`   User: ${invoice.username || 'Unknown'} | Plan: ${invoice.plan_name || 'Unknown'}`);
        console.log(`   Due: ${invoice.due_date} | Created: ${invoice.created_at}`);
        console.log('');
      });
      
      // Check invoice status distribution
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM invoices
        GROUP BY status
        ORDER BY count DESC
      `;
      const statusResult = await pool.query(statusQuery);
      
      console.log('\n📊 INVOICE STATUS BREAKDOWN:');
      statusResult.rows.forEach(status => {
        console.log(`   ${status.status}: ${status.count} invoices`);
      });
    }
    
    // 3. Check for missed collections
    console.log('\n❌ 3. CHECKING MISSED COLLECTIONS');
    console.log('-'.repeat(40));
    
    const missedCollectionsQuery = `
      SELECT COUNT(*) as total
      FROM collection_stop_events
      WHERE action = 'missed'
    `;
    const missedCount = await pool.query(missedCollectionsQuery);
    console.log(`Total missed collections: ${missedCount.rows[0].total}`);
    
    if (missedCount.rows[0].total > 0) {
      const sampleMissedQuery = `
        SELECT 
          cse.id,
          cse.action,
          cse.created_at,
          cse.notes,
          u.username as resident_name,
          b.barangay_name
        FROM collection_stop_events cse
        LEFT JOIN users u ON CAST(cse.user_id AS INTEGER) = CAST(u.user_id AS INTEGER)
        LEFT JOIN addresses a ON CAST(u.address_id AS INTEGER) = CAST(a.address_id AS INTEGER)
        LEFT JOIN barangays b ON CAST(a.barangay_id AS INTEGER) = CAST(b.barangay_id AS INTEGER)
        WHERE cse.action = 'missed'
        ORDER BY cse.created_at DESC
        LIMIT 5
      `;
      const sampleMissed = await pool.query(sampleMissedQuery);
      
      console.log('\n📋 SAMPLE MISSED COLLECTIONS:');
      sampleMissed.rows.forEach(missed => {
        console.log(`   ID: ${missed.id} | Resident: ${missed.resident_name || 'Unknown'}`);
        console.log(`   Barangay: ${missed.barangay_name || 'Unknown'} | Date: ${missed.created_at}`);
        console.log(`   Notes: ${missed.notes || 'No notes'}`);
        console.log('');
      });
    } else {
      console.log('\n✅ No missed collections found');
      console.log('   This means all collections were completed successfully');
    }
    
    // 4. Check collection_stop_events actions
    console.log('\n📊 4. COLLECTION ACTIONS BREAKDOWN');
    console.log('-'.repeat(40));
    
    const actionsQuery = `
      SELECT action, COUNT(*) as count
      FROM collection_stop_events
      GROUP BY action
      ORDER BY count DESC
    `;
    const actionsResult = await pool.query(actionsQuery);
    
    console.log('Collection actions in database:');
    actionsResult.rows.forEach(action => {
      console.log(`   ${action.action}: ${action.count} events`);
    });
    
    // 5. Test the billing history query
    console.log('\n🧪 5. TESTING BILLING HISTORY QUERY');
    console.log('-'.repeat(40));
    
    const billingQuery = `
      SELECT 
        i.invoice_id as transaction_id,
        i.invoice_number as invoice_id,
        u.username as subscriber,
        sp.plan_name as plan,
        i.amount,
        i.created_at as payment_date,
        'Invoice' as payment_method,
        i.status,
        'Generated from subscription' as notes,
        i.invoice_number as reference_number,
        NULL as collector_name,
        u.contact_number as phone
      FROM invoices i
      LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
      LEFT JOIN users u ON cs.user_id = u.user_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      ORDER BY i.created_at DESC
      LIMIT 10
    `;
    
    const billingResult = await pool.query(billingQuery);
    console.log(`Found ${billingResult.rows.length} billing records using invoices table:`);
    
    billingResult.rows.forEach(record => {
      console.log(`   ${record.invoice_id} | ${record.subscriber || 'Unknown'} | ₱${record.amount} | ${record.status}`);
    });
    
    // 6. Recommendations
    console.log('\n💡 6. RECOMMENDATIONS');
    console.log('-'.repeat(40));
    
    if (paymentsCount.rows[0].total === 0) {
      console.log('🔧 PAYMENT HISTORY FIX:');
      console.log('   • Payments table is empty - use invoices table instead');
      console.log('   • Update getBillingHistory() to query invoices table');
      console.log('   • Show invoice status instead of payment status');
    }
    
    if (missedCount.rows[0].total === 0) {
      console.log('🔧 MISSED COLLECTIONS:');
      console.log('   • No missed collections in database');
      console.log('   • All collections were marked as "collected"');
      console.log('   • This is actually good - means high efficiency!');
    }
    
    console.log('🔧 REPORT PDF FIXES:');
    console.log('   • "[object Object]" issue: Check waste type breakdown formatting');
    console.log('   • "NaN%" issue: Ensure proper percentage calculations');
    console.log('   • Use proper string formatting in PDF generation');
    
    console.log('\n🎉 Debug Analysis Complete!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugPaymentHistory();
