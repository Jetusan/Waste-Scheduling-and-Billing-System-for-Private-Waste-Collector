const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getPassword() {
    return new Promise((resolve) => {
        rl.question('Enter your PostgreSQL password: ', (password) => {
            resolve(password);
        });
    });
}

async function setupDatabase() {
    const password = await getPassword();
    const config = {
        user: 'postgres',
        host: 'localhost',
        password: password,
        port: 5432,
        database: 'waste_collection_db'
    };

    const dbPool = new Pool(config);
    
    try {
        // Read and execute init.sql (creates cities and barangays)
        console.log('Creating/updating basic tables...');
        const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        await dbPool.query(initSql);

        // Read and execute waste_management_tables.sql
        console.log('Creating/updating waste management tables...');
        const wasteMgmtSql = fs.readFileSync(path.join(__dirname, 'waste_management_tables.sql'), 'utf8');
        await dbPool.query(wasteMgmtSql);

        console.log('All database tables updated successfully!');
        
    } catch (error) {
        console.error('Error updating database:', error);
        process.exit(1);
    } finally {
        // Close the database connection and readline interface
        await dbPool.end();
        rl.close();
    }
}

// Run the setup
setupDatabase(); 