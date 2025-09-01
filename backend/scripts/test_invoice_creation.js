// Test script to verify invoice creation works with current schema
const { pool } = require('../config/db');

async function testInvoiceCreation() {
  console.log('🧪 Testing invoice creation with current schema...\n');

  try {
    // Test data for invoice creation
    const testInvoiceData = {
      user_id: 1, // Assuming user_id 1 exists
      plan_id: 3, // Full Plan
      due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // 30 days from now
      generated_date: new Date().toISOString().split('T')[0],
      notes: 'Test invoice for schema validation'
    };

    // Generate invoice number
    const invoiceNumberQuery = 'SELECT COUNT(*) + 1 as next_number FROM invoices';
    const invoiceNumberResult = await pool.query(invoiceNumberQuery);
    const invoiceNumber = `INV-${String(invoiceNumberResult.rows[0].next_number).padStart(3, '0')}`;

    console.log('📝 Creating test invoice with data:');
    console.log(JSON.stringify({...testInvoiceData, invoice_number: invoiceNumber}, null, 2));

    // Insert test invoice
    const query = `
      INSERT INTO invoices (invoice_number, user_id, plan_id, due_date, generated_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      invoiceNumber, 
      testInvoiceData.user_id, 
      testInvoiceData.plan_id, 
      testInvoiceData.due_date, 
      testInvoiceData.generated_date, 
      testInvoiceData.notes
    ]);

    console.log('\n✅ Invoice created successfully!');
    console.table(result.rows);

    // Test retrieving invoice with plan details
    const retrieveQuery = `
      SELECT 
        i.*,
        sp.plan_name,
        sp.price,
        u.username
      FROM invoices i
      JOIN subscription_plans sp ON i.plan_id = sp.plan_id
      LEFT JOIN users u ON i.user_id = u.user_id
      WHERE i.invoice_id = $1
    `;
    
    const retrieveResult = await pool.query(retrieveQuery, [result.rows[0].invoice_id]);
    
    console.log('\n✅ Invoice with plan details:');
    console.table(retrieveResult.rows);

  } catch (error) {
    console.error('❌ Error testing invoice creation:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testInvoiceCreation();
