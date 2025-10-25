#!/usr/bin/env node

const pool = require('./config/dbAdmin');

async function checkCollectionSchedules() {
  try {
    // 1. Does table exist?
    const tableExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name   = 'collection_schedules'
       ) AS exists`
    );

    if (!tableExists.rows[0].exists) {
      console.log('collection_schedules table does NOT exist.');
      return;
    }

    console.log('collection_schedules table EXISTS. Column layout:');

    // 2. Column layout
    const columns = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'collection_schedules'
       ORDER BY ordinal_position`
    );

    columns.rows.forEach(col => {
      console.log(
        `  ${col.column_name.padEnd(18)} ${col.data_type.padEnd(15)} ` +
        `nullable=${col.is_nullable} default=${col.column_default}`
      );
    });

    // 3. Check for legacy column
    const legacy = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'collection_schedules'
           AND column_name  = 'collection_id'
       ) AS legacy`
    );
    if (legacy.rows[0].legacy) {
      console.log('⚠ Legacy schema detected (collection_id column is present).');
    }

    // 4. Check subdivision column
    const subdivision = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'collection_schedules'
           AND column_name  = 'subdivision'
       ) AS subdivision`
    );
    if (subdivision.rows[0].subdivision) {
      console.log('✅ subdivision column is present.');
    } else {
      console.log('⚠ subdivision column is MISSING.');
    }

    // 5. List indexes
    const indexes = await pool.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename  = 'collection_schedules'
       ORDER BY indexname`
    );
    console.log('Indexes on collection_schedules:');
    indexes.rows.forEach(idx => console.log(`  ${idx.indexname}`));

    // 6. Check trigger
    const trigger = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_trigger
         WHERE tgname = 'update_collection_schedules_updated_at'
           AND tgrelid = 'collection_schedules'::regclass
           AND NOT tgisinternal
       ) AS trigger_present`
    );
    if (trigger.rows[0].trigger_present) {
      console.log('✅ update_collection_schedules_updated_at trigger is present.');
    } else {
      console.log('⚠ update_collection_schedules_updated_at trigger is missing.');
    }

    // 7. Sample data count (optional - to see if there's any data)
    const count = await pool.query(
      `SELECT COUNT(*) as row_count FROM collection_schedules`
    );
    console.log(`\n📊 Total rows in table: ${count.rows[0].row_count}`);

  } catch (err) {
    console.error('Error checking collection_schedules table:', err);
  } finally {
    // No need to end the pool connection for a single query
    process.exit(0);
  }
}

checkCollectionSchedules();