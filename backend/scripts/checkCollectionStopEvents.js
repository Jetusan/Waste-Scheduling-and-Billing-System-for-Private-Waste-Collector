// scripts/check_collection_stop_events.js
const { pool } = require('../config/db');

async function checkCollectionStopEvents() {
  console.log('🔍 Checking collection_stop_events table...\n');

  try {
    // 1️⃣ Check table attributes (columns)
    const attributesQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length, 
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_name = 'collection_stop_events'
      ORDER BY ordinal_position;
    `;

    const attributes = await pool.query(attributesQuery);

    if (attributes.rows.length > 0) {
      console.log('✅ Collection_Stop_Events Table Attributes:\n');
      console.table(attributes.rows);
    } else {
      console.log('⚠️ No attributes found. Table "collection_stop_events" may not exist.');
    }

    // 2️⃣ Show ALL data
    const dataQuery = `SELECT * FROM collection_stop_events;`;
    const data = await pool.query(dataQuery);

    console.log('\n✅ Data from collection_stop_events table:\n');
    if (data.rows.length > 0) {
      console.table(data.rows);
      console.log(`\n📊 Total rows: ${data.rows.length}`);
    } else {
      console.log('⚠️ No data found in collection_stop_events table.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCollectionStopEvents();
