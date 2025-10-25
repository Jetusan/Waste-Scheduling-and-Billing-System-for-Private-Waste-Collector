#!/usr/bin/env node

/**
 * Database Schema Checker
 * Analyzes all tables and their relationships to help with user deletion
 */

const path = require('path');
const pool = require(path.resolve(__dirname, '../config/dbAdmin'));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.magenta}═══ ${msg} ═══${colors.reset}\n`)
};

async function getAllTables() {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.table_name);
  } catch (error) {
    log.error(`Error getting tables: ${error.message}`);
    return [];
  }
}

async function getTableColumns(tableName) {
  try {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const result = await pool.query(query, [tableName]);
    return result.rows;
  } catch (error) {
    log.error(`Error getting columns for ${tableName}: ${error.message}`);
    return [];
  }
}

async function getForeignKeys(tableName) {
  try {
    const query = `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = $1;
    `;
    const result = await pool.query(query, [tableName]);
    return result.rows;
  } catch (error) {
    log.error(`Error getting foreign keys for ${tableName}: ${error.message}`);
    return [];
  }
}

async function getTablesReferencingUsers() {
  try {
    const query = `
      SELECT DISTINCT
        tc.table_name,
        kcu.column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'user_id'
      ORDER BY tc.table_name;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    log.error(`Error getting tables referencing users: ${error.message}`);
    return [];
  }
}

async function checkUserIdColumns() {
  try {
    const query = `
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (column_name LIKE '%user_id%' OR column_name LIKE '%resident_id%')
      ORDER BY table_name, column_name;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    log.error(`Error checking user_id columns: ${error.message}`);
    return [];
  }
}

async function getRecordCounts() {
  const tables = await getAllTables();
  const counts = {};
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count);
    } catch (error) {
      counts[table] = `Error: ${error.message}`;
    }
  }
  
  return counts;
}

async function analyzeDatabase() {
  log.header('DATABASE SCHEMA ANALYSIS');
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    log.success('Database connected successfully');
  } catch (error) {
    log.error(`Cannot connect to database: ${error.message}`);
    return;
  }
  
  // Get all tables
  log.header('ALL TABLES');
  const tables = await getAllTables();
  log.info(`Found ${tables.length} tables:`);
  tables.forEach((table, index) => {
    console.log(`${index + 1}. ${table}`);
  });
  
  // Get tables that reference users
  log.header('TABLES REFERENCING USERS');
  const userReferences = await getTablesReferencingUsers();
  if (userReferences.length > 0) {
    log.info('Tables with foreign keys to users table:');
    userReferences.forEach(ref => {
      console.log(`- ${ref.table_name}.${ref.column_name} (DELETE ${ref.delete_rule})`);
    });
  } else {
    log.warning('No tables found with foreign keys to users table');
  }
  
  // Check all user_id/resident_id columns
  log.header('USER ID COLUMNS');
  const userIdColumns = await checkUserIdColumns();
  if (userIdColumns.length > 0) {
    log.info('Tables with user_id or resident_id columns:');
    userIdColumns.forEach(col => {
      console.log(`- ${col.table_name}.${col.column_name} (${col.data_type})`);
    });
  }
  
  // Get record counts
  log.header('RECORD COUNTS');
  const counts = await getRecordCounts();
  Object.entries(counts).forEach(([table, count]) => {
    if (typeof count === 'number') {
      console.log(`${table}: ${count.toLocaleString()} records`);
    } else {
      console.log(`${table}: ${count}`);
    }
  });
  
  // Analyze specific important tables
  log.header('DETAILED TABLE ANALYSIS');
  
  const importantTables = ['users', 'invoices', 'customer_subscriptions', 'receipts', 'collection_stop_events'];
  
  for (const table of importantTables) {
    if (tables.includes(table)) {
      console.log(`\n--- ${table.toUpperCase()} ---`);
      
      // Get columns
      const columns = await getTableColumns(table);
      console.log('Columns:');
      columns.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Get foreign keys
      const foreignKeys = await getForeignKeys(table);
      if (foreignKeys.length > 0) {
        console.log('Foreign Keys:');
        foreignKeys.forEach(fk => {
          console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (DELETE ${fk.delete_rule})`);
        });
      }
    }
  }
  
  log.header('DELETION STRATEGY RECOMMENDATIONS');
  
  // Analyze deletion dependencies
  log.info('Based on the schema analysis, here\'s the recommended deletion order:');
  
  const deletionOrder = [];
  
  // Tables that reference other tables should be deleted first
  if (tables.includes('receipts')) {
    deletionOrder.push('receipts (references invoices and users)');
  }
  
  if (tables.includes('collection_stop_events')) {
    deletionOrder.push('collection_stop_events (references users)');
  }
  
  if (tables.includes('special_pickup_requests')) {
    deletionOrder.push('special_pickup_requests (references users)');
  }
  
  if (tables.includes('invoices')) {
    deletionOrder.push('invoices (references customer_subscriptions and users)');
  }
  
  if (tables.includes('customer_subscriptions')) {
    deletionOrder.push('customer_subscriptions (references users)');
  }
  
  deletionOrder.push('users (main table)');
  deletionOrder.push('user_names (if exists)');
  deletionOrder.push('addresses (if exists)');
  
  deletionOrder.forEach((item, index) => {
    console.log(`${index + 1}. ${item}`);
  });
  
  log.success('Schema analysis complete!');
}

// Run the analysis
analyzeDatabase().catch((error) => {
  log.error(`Analysis error: ${error.message}`);
  process.exit(1);
});
