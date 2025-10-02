#!/usr/bin/env node

const { pool } = require('../config/db');

async function checkCollectionStopEvents() {
  console.log('🔍 Checking collection_stop_events table...\n');
  
  try {
    // Check all recent collection stop events
    const query = `
      SELECT 
        id,
        action,
        stop_id,
        schedule_id,
        user_id,
        collector_id,
        notes,
        amount,
        lat,
        lng,
        created_at
      FROM collection_stop_events
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ No collection stop events found in the table');
      await pool.end();
      process.exit(0);
    }
    
    console.log(`📊 Found ${result.rows.length} recent event(s):\n`);
    
    result.rows.forEach((event, index) => {
      console.log(`${index + 1}. Event ID: ${event.id}`);
      console.log(`   Action: ${event.action}`);
      console.log(`   Stop ID: ${event.stop_id || 'null'}`);
      console.log(`   Schedule ID: ${event.schedule_id || 'null'}`);
      console.log(`   User ID: ${event.user_id}`);
      console.log(`   Collector ID: ${event.collector_id}`);
      console.log(`   Notes: ${event.notes || 'N/A'}`);
      console.log(`   Amount: ${event.amount ? '₱' + event.amount : 'N/A'}`);
      console.log(`   Location: ${event.lat && event.lng ? `${event.lat}, ${event.lng}` : 'N/A'}`);
      console.log(`   Created: ${new Date(event.created_at).toLocaleString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkCollectionStopEvents();
