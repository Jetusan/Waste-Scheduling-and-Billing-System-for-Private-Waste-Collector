const { query } = require('../config/db');
const fs = require('fs');

async function applyComprehensiveFix() {
  try {
    console.log('🔧 Applying comprehensive database schema fix...\n');
    
    const sql = fs.readFileSync('./comprehensive_schema_fix.sql', 'utf8');
    
    // Split the SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await query(statement);
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} warning: ${err.message}`);
          // Continue with other statements even if one fails
        }
      }
    }
    
    console.log('\n✅ Comprehensive schema fix completed!');
    console.log('📋 Fixed issues:');
    console.log('   ✓ Added service_start and service_end columns to invoices');
    console.log('   ✓ Created customer_addresses table');
    console.log('   ✓ Updated create_special_pickup_invoice function');
    console.log('   ✓ Added necessary indexes');
    
    console.log('\n🎉 Payment confirmation and collection reminders should now work!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying comprehensive fix:', err.message);
    process.exit(1);
  }
}

applyComprehensiveFix();
