const { query } = require('../config/db');
const fs = require('fs');

async function applyFix() {
  try {
    console.log('🔧 Applying special pickup function fix...');
    
    const sql = fs.readFileSync('./fix_special_pickup_function.sql', 'utf8');
    await query(sql);
    
    console.log('✅ Special pickup function fixed successfully!');
    console.log('📝 Function updated to work without service_start/service_end columns');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying fix:', err.message);
    process.exit(1);
  }
}

applyFix();
