// Script to execute the schema fix for invoices table
const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runSchemaFix() {
  console.log('🔧 Starting invoices table schema fix...\n');

  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'fix_invoices_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL commands by semicolon and filter out empty ones
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
    
    console.log(`📝 Found ${commands.length} SQL commands to execute\n`);
    
    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        console.log(`⚡ Executing command ${i + 1}:`);
        console.log(`   ${command.substring(0, 50)}...`);
        
        const result = await pool.query(command);
        
        if (result.rows && result.rows.length > 0) {
          console.log('✅ Result:');
          console.table(result.rows);
        } else {
          console.log('✅ Command executed successfully');
        }
        console.log('');
      }
    }
    
    console.log('🎉 Schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error executing schema fix:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

runSchemaFix();
