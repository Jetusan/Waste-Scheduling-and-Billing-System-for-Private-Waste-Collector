const { query } = require('../config/db');
const fs = require('fs');

async function applyPaymentFix() {
  try {
    console.log('🔧 Applying payment collection function fix...');
    
    // Apply the fixed collect_special_pickup_payment function
    const sql = fs.readFileSync('./fix_collect_payment_function.sql', 'utf8');
    await query(sql);
    
    console.log('✅ Payment collection function fixed successfully!');
    console.log('📝 Function updated to handle invoice creation errors gracefully');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying payment fix:', err.message);
    process.exit(1);
  }
}

applyPaymentFix();
