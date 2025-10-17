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

async function checkBillingTables() {
  try {
    console.log('🔍 Connecting to Neon PostgreSQL database...');
    console.log(`📡 Host: ${process.env.DB_HOST}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME}`);
    console.log('=' .repeat(80));
    
    // Get all tables in the database
    console.log('\n📊 ALL TABLES IN DATABASE:');
    const allTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const allTables = await pool.query(allTablesQuery);
    
    allTables.rows.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name}`);
    });
    
    console.log(`\n📈 Total tables: ${allTables.rows.length}`);
    console.log('=' .repeat(80));
    
    // Check specific billing-related tables
    const billingTables = [
      'users',
      'subscription_plans', 
      'customer_subscriptions',
      'invoices',
      'payments',
      'payment_sources'
    ];
    
    console.log('\n🏦 BILLING-RELATED TABLES ANALYSIS:');
    
    for (const tableName of billingTables) {
      console.log(`\n🔍 Checking table: ${tableName}`);
      console.log('-'.repeat(50));
      
      // Check if table exists
      const tableExistsQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `;
      const tableExists = await pool.query(tableExistsQuery, [tableName]);
      
      if (tableExists.rows.length === 0) {
        console.log(`❌ Table '${tableName}' does NOT exist`);
        continue;
      }
      
      console.log(`✅ Table '${tableName}' exists`);
      
      // Get table structure
      const columnsQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `;
      const columns = await pool.query(columnsQuery, [tableName]);
      
      console.log(`📋 Columns (${columns.rows.length}):`);
      columns.rows.forEach(col => {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  • ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      
      // Get row count
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const countResult = await pool.query(countQuery);
        console.log(`📊 Row count: ${countResult.rows[0].count}`);
      } catch (error) {
        console.log(`⚠️  Could not get row count: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 FOREIGN KEY RELATIONSHIPS:');
    console.log('-'.repeat(50));
    
    // Check foreign key constraints
    const fkQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    const foreignKeys = await pool.query(fkQuery);
    
    if (foreignKeys.rows.length > 0) {
      foreignKeys.rows.forEach(fk => {
        console.log(`🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('⚠️  No foreign key relationships found');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📝 SAMPLE DATA FROM KEY TABLES:');
    console.log('-'.repeat(50));
    
    // Show sample data from key tables
    const sampleTables = ['subscription_plans', 'customer_subscriptions', 'invoices'];
    
    for (const tableName of sampleTables) {
      const tableExists = allTables.rows.find(t => t.table_name === tableName);
      if (tableExists) {
        try {
          const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
          const sampleData = await pool.query(sampleQuery);
          
          console.log(`\n📄 Sample data from '${tableName}':`);
          if (sampleData.rows.length > 0) {
            console.log(JSON.stringify(sampleData.rows, null, 2));
          } else {
            console.log('  (No data found)');
          }
        } catch (error) {
          console.log(`⚠️  Could not fetch sample data from ${tableName}: ${error.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Database schema check completed!');
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the check
checkBillingTables().catch(console.error);
