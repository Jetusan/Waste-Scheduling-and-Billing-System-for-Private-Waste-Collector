const { Pool } = require('pg');
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

async function listTables() {
    const password = await getPassword();
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        password: password,
        port: 5432,
        database: 'waste_collection_db'
    });
    
    try {
        // Query to get all tables and their columns
        const query = `
            SELECT 
                table_name,
                array_agg(column_name || ' (' || data_type || ')') as columns
            FROM information_schema.columns
            WHERE table_schema = 'public'
            GROUP BY table_name
            ORDER BY table_name;
        `;
        
        const result = await pool.query(query);
        
        console.log('\nExisting tables in waste_collection_db:\n');
        result.rows.forEach(table => {
            console.log(`Table: ${table.table_name}`);
            console.log('Columns:');
            table.columns.forEach(column => {
                console.log(`  - ${column}`);
            });
            console.log('');
        });

    } catch (error) {
        console.error('Error listing tables:', error);
    } finally {
        await pool.end();
        rl.close();
    }
}

listTables(); 