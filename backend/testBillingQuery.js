const { schedulingPool } = require('./config/db');

async function testQuery() {
  try {
    console.log('Testing database query...');
    
    const query = 'SELECT * FROM subscription_plans WHERE status = $1 ORDER BY plan_name';
    const result = await schedulingPool.query(query, ['active']);
    
    console.log('✅ Query successful!');
    console.log('Rows found:', result.rows.length);
    console.log('Data:', result.rows);
    
  } catch (error) {
    console.error('❌ Query failed:', error);
  } finally {
    await schedulingPool.end();
  }
}

testQuery(); 