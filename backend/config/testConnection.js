const { schedulingPool } = require('./db');

async function testConnection() {
    try {
        // Test database connection
        const { rows } = await schedulingPool.query('SELECT NOW()');
        console.log('✅ Database connection successful!');
        console.log('Current timestamp from DB:', rows[0].now);

        // Test users table
        const usersResult = await schedulingPool.query('SELECT COUNT(*) FROM users');
        console.log('Users count:', usersResult.rows[0].count);

        // Test residents table
        const residentsResult = await schedulingPool.query('SELECT COUNT(*) FROM residents');
        console.log('Residents count:', residentsResult.rows[0].count);

        // Test collectors table
        const collectorsResult = await schedulingPool.query('SELECT COUNT(*) FROM collectors');
        console.log('Collectors count:', collectorsResult.rows[0].count);

        // Test trucks table
        const trucksResult = await schedulingPool.query('SELECT COUNT(*) FROM trucks');
        console.log('Trucks count:', trucksResult.rows[0].count);

    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('Make sure PostgreSQL is running and the connection details are correct.');
        }
        if (error.code === '3D000') {
            console.error('Database does not exist. Please create the database first.');
        }
        if (error.code === '42P01') {
            console.error('Tables do not exist. Please run the initialization scripts first.');
        }
    } finally {
        await schedulingPool.end();
    }
}

testConnection(); 