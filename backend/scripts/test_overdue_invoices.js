const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function testOverdueInvoices() {
  try {
    console.log('🔍 Testing Overdue Invoice Detection...');
    console.log('=' .repeat(60));
    
    // Get current date
    const today = new Date();
    console.log(`📅 Today's Date: ${today.toDateString()}`);
    
    // Check all invoices with their due dates and status
    const invoicesQuery = `
      SELECT 
        invoice_id,
        invoice_number,
        amount,
        status,
        due_date,
        generated_date,
        CASE 
          WHEN due_date < CURRENT_DATE AND status != 'paid' THEN 'OVERDUE'
          WHEN status = 'paid' THEN 'PAID'
          ELSE 'CURRENT'
        END as calculated_status,
        (CURRENT_DATE - due_date) as days_overdue
      FROM invoices
      ORDER BY due_date DESC
      LIMIT 10
    `;
    
    const invoices = await pool.query(invoicesQuery);
    
    console.log('\n📋 INVOICE STATUS ANALYSIS:');
    console.log('-'.repeat(50));
    
    invoices.rows.forEach(invoice => {
      const dueDate = new Date(invoice.due_date);
      const isOverdue = today > dueDate && invoice.status !== 'paid';
      
      console.log(`\n📄 ${invoice.invoice_number}:`);
      console.log(`   • Amount: ₱${invoice.amount}`);
      console.log(`   • Status: ${invoice.status}`);
      console.log(`   • Due Date: ${dueDate.toDateString()}`);
      console.log(`   • Days Overdue: ${invoice.days_overdue || 0}`);
      console.log(`   • Calculated Status: ${invoice.calculated_status}`);
      console.log(`   • Should be Overdue: ${isOverdue ? 'YES' : 'NO'}`);
    });
    
    // Get overdue statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 OVERDUE STATISTICS:');
    console.log('-'.repeat(50));
    
    const overdueStatsQuery = `
      SELECT 
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'paid' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(*) as total_count,
        SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'paid' THEN amount ELSE 0 END) as overdue_amount
      FROM invoices
    `;
    
    const stats = await pool.query(overdueStatsQuery);
    const stat = stats.rows[0];
    
    console.log(`📈 Total Invoices: ${stat.total_count}`);
    console.log(`✅ Paid: ${stat.paid_count}`);
    console.log(`⏳ Unpaid: ${stat.unpaid_count}`);
    console.log(`⚠️  Overdue: ${stat.overdue_count}`);
    console.log(`💰 Overdue Amount: ₱${parseFloat(stat.overdue_amount || 0).toLocaleString()}`);
    
    // Check specific overdue invoices
    console.log('\n📋 SPECIFIC OVERDUE INVOICES:');
    console.log('-'.repeat(50));
    
    const overdueQuery = `
      SELECT 
        invoice_number,
        amount,
        status,
        due_date,
        (CURRENT_DATE - due_date) as days_overdue
      FROM invoices
      WHERE due_date < CURRENT_DATE AND status != 'paid'
      ORDER BY due_date ASC
    `;
    
    const overdueInvoices = await pool.query(overdueQuery);
    
    if (overdueInvoices.rows.length > 0) {
      overdueInvoices.rows.forEach(invoice => {
        console.log(`⚠️  ${invoice.invoice_number}: ₱${invoice.amount} (${invoice.days_overdue} days overdue)`);
      });
    } else {
      console.log('✅ No overdue invoices found');
    }
    
    console.log('\n✅ Overdue invoice test completed!');
    
  } catch (error) {
    console.error('❌ Error testing overdue invoices:', error);
  } finally {
    await pool.end();
  }
}

testOverdueInvoices().catch(console.error);
