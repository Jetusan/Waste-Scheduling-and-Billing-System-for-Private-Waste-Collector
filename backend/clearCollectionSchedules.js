#!/usr/bin/env node

const pool = require('./config/dbAdmin');

async function clearCollectionSchedules() {
  try {
    console.log('🗑️ Clearing collection schedules data...\n');

    // 1. First delete from junction tables (to maintain referential integrity)
    console.log('Clearing schedule_barangays table...');
    await pool.query('DELETE FROM schedule_barangays');
    console.log('✅ schedule_barangays cleared\n');

    // 2. Clear schedule_status_history if it exists
    try {
      console.log('Clearing schedule_status_history table...');
      await pool.query('DELETE FROM schedule_status_history');
      console.log('✅ schedule_status_history cleared\n');
    } catch (error) {
      console.log('ℹ️ schedule_status_history table does not exist or already empty\n');
    }

    // 3. Finally delete all collection schedules
    console.log('Clearing collection_schedules table...');
    const result = await pool.query('DELETE FROM collection_schedules');
    console.log(`✅ Deleted ${result.rowCount} records from collection_schedules\n`);

    // 4. Reset the sequence (so new IDs start from 1)
    console.log('Resetting schedule_id sequence...');
    await pool.query('ALTER SEQUENCE collection_schedules_schedule_id_seq RESTART WITH 1');
    console.log('✅ Sequence reset\n');

    console.log('🎉 All collection schedules data has been cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
  } finally {
    process.exit(0);
  }
}

clearCollectionSchedules();