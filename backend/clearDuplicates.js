#!/usr/bin/env node

const pool = require('./config/db');

async function clearDuplicates() {
  try {
    console.log('🗑️ Starting duplicate cleanup...');
    
    // Option 1: Clear all records for user 143 (your user)
    const result = await pool.query(
      'DELETE FROM manual_payment_verifications WHERE user_id = $1 RETURNING *',
      [143]
    );

    console.log(`✅ Successfully cleared ${result.rows.length} duplicate records for user 143`);
    
    if (result.rows.length > 0) {
      console.log('📋 Cleared records:');
      result.rows.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.verification_id}, Status: ${record.verification_status}, Created: ${record.created_at}`);
      });
    } else {
      console.log('ℹ️  No duplicate records found to clear.');
    }

    console.log('🎉 Cleanup complete! You can now test with the same image again.');
    
  } catch (error) {
    console.error('❌ Error clearing duplicates:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close database connection (pool doesn't have end() method)
    console.log('🔌 Database connection will be closed automatically.');
    process.exit(0);
  }
}

// Add command line options
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🗑️ Clear Duplicate Images Script

Usage:
  node clearDuplicates.js [options]

Options:
  --all, -a        Clear all records for user 143
  --rejected, -r   Clear only rejected records
  --pending, -p    Clear only pending records
  --help, -h       Show this help message

Examples:
  node clearDuplicates.js           # Clear all records
  node clearDuplicates.js --rejected # Clear only rejected records
  node clearDuplicates.js --pending  # Clear only pending records
`);
  process.exit(0);
}

// Handle different options
async function main() {
  if (args.includes('--rejected') || args.includes('-r')) {
    // Clear only rejected records
    try {
      console.log('🗑️ Clearing only rejected records...');
      const result = await pool.query(
        'DELETE FROM manual_payment_verifications WHERE user_id = $1 AND verification_status = $2 RETURNING *',
        [143, 'rejected']
      );
      console.log(`✅ Cleared ${result.rows.length} rejected records`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pool.end();
      process.exit(0);
    }
  } else if (args.includes('--pending') || args.includes('-p')) {
    // Clear only pending records
    try {
      console.log('🗑️ Clearing only pending records...');
      const result = await pool.query(
        'DELETE FROM manual_payment_verifications WHERE user_id = $1 AND verification_status = $2 RETURNING *',
        [143, 'pending']
      );
      console.log(`✅ Cleared ${result.rows.length} pending records`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      await pool.end();
      process.exit(0);
    }
  } else {
    // Default: clear all records
    await clearDuplicates();
  }
}

main();
