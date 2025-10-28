const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'neondb',
  user: process.env.DB_USER || 'neondb_owner',
  password: process.env.DB_PASSWORD || 'npg_DZf0c3qxWQim',
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyLedgerFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting ledger order fix...');
    
    // Read the SQL fix file
    const sqlPath = path.join(__dirname, 'fix_ledger_order.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements (simple split on semicolon)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toLowerCase().includes('commit')) continue; // Skip COMMIT statements
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
      } catch (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        // Continue with other statements for non-critical errors
        if (error.message.includes('does not exist')) {
          console.log('⚠️ Object does not exist, continuing...');
        } else {
          throw error;
        }
      }
    }
    
    // Test the fix by querying a sample ledger
    console.log('🧪 Testing ledger order fix...');
    const testQuery = `
      SELECT 
        date,
        description,
        reference,
        CASE WHEN debit > 0 THEN debit ELSE NULL END as debit,
        CASE WHEN credit > 0 THEN credit ELSE NULL END as credit,
        balance
      FROM user_ledger_entries 
      WHERE user_id = (SELECT user_id FROM invoices LIMIT 1)
      ORDER BY sort_date, CASE WHEN entry_type = 'invoice' THEN 1 ELSE 2 END
      LIMIT 10
    `;
    
    const testResult = await client.query(testQuery);
    console.log('📊 Sample ledger entries after fix:');
    testResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.date.toISOString().split('T')[0]} | ${row.description} | ${row.reference} | Debit: ${row.debit || '—'} | Credit: ${row.credit || '—'} | Balance: ${row.balance}`);
    });
    
    console.log('✅ Ledger order fix completed successfully!');
    console.log('');
    console.log('🎯 Changes applied:');
    console.log('• Invoices now appear BEFORE payments on the same date');
    console.log('• Invoice descriptions simplified to: Monthly Subscription Fee, Special Pickup Service, Late Payment Fee');
    console.log('• Payment descriptions standardized: Manual GCash, cash, etc.');
    console.log('• Proper reference numbers generated for all transactions');
    console.log('• Running balance calculation fixed with correct ordering');
    
  } catch (error) {
    console.error('❌ Error applying ledger fix:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the fix
if (require.main === module) {
  applyLedgerFix()
    .then(() => {
      console.log('🎉 Ledger fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ledger fix failed:', error);
      process.exit(1);
    });
}

module.exports = { applyLedgerFix };
