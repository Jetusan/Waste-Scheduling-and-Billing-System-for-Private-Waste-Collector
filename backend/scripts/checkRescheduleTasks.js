// scripts/checkRescheduleTasks.js
// Read-only diagnostic script for reschedule_tasks
const { pool } = require('../config/db');

async function main() {
  console.log('🔍 Checking reschedule_tasks (catch-ups) ...\n');
  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;

    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'reschedule_tasks'
      ORDER BY ordinal_position;
    `);
    if (cols.rows.length === 0) {
      console.log('⚠️ reschedule_tasks table not found. Did you run the migration?');
    } else {
      console.log('✅ reschedule_tasks columns:');
      console.table(cols.rows);
    }

    const all = await pool.query('SELECT * FROM reschedule_tasks ORDER BY scheduled_date DESC, id DESC');
    console.log('\n📋 All reschedule_tasks:');
    if (all.rows.length > 0) {
      console.table(all.rows);
      console.log(`Total: ${all.rows.length}`);
    } else {
      console.log('No rows.');
    }

    const todays = await pool.query('SELECT * FROM reschedule_tasks WHERE scheduled_date = $1 ORDER BY id DESC', [today]);
    console.log(`\n📅 Today (${today}) reschedule_tasks:`);
    if (todays.rows.length > 0) {
      console.table(todays.rows);
    } else {
      console.log('No catch-ups scheduled for today.');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
