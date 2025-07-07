const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection for postgres
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    password: 'postgres',
    port: 5432
});

async function initializeDatabase() {
    try {
        // Connect to postgres to create new database
        await pool.query(`
            DROP DATABASE IF EXISTS waste_management_db;
            CREATE DATABASE waste_management_db;
        `);

        console.log('Database waste_management_db created successfully');

        // Create a new connection to the waste_management_db
        const dbPool = new Pool({
            user: 'postgres',
            host: 'localhost',
            password: 'postgres',
            database: 'waste_management_db',
            port: 5432
        });

        // Read and execute the init.sql file
        const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        await dbPool.query(initSql);

        console.log('Database tables created successfully');

        // Close connections
        await dbPool.end();
        await pool.end();

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeDatabase(); 