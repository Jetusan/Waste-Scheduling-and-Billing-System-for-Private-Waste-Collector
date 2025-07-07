const { schedulingPool } = require('./db');

async function initializeDatabase() {
    try {
        // Create barangays table if it doesn't exist
        await schedulingPool.query(`
            CREATE TABLE IF NOT EXISTS barangays (
                barangay_id SERIAL PRIMARY KEY,
                barangay_name VARCHAR(100) NOT NULL
            );
        `);
        console.log('✅ Barangays table created or already exists');

        // Insert barangay data
        const barangays = [
            'Apopong', 'Dadiangas North', 'Olympog', 'Baluan',
            'Dadiangas South', 'San Isidro', 'Batomelong',
            'Dadiangas West', 'San Jose', 'Buayan', 'Fatima',
            'Siguel', 'Bula', 'Katangawan', 'Sinawal',
            'Calumpang', 'Labangal', 'Tambler', 'City Heights',
            'Lagao', 'Tinagacan', 'Conel', 'Ligaya',
            'Upper Labay', 'Dadiangas East', 'Mabuhay'
        ];

        // Clear existing data
        await schedulingPool.query('TRUNCATE barangays RESTART IDENTITY CASCADE');
        console.log('✅ Cleared existing barangay data');

        // Insert new data
        for (const barangay of barangays) {
            await schedulingPool.query(
                'INSERT INTO barangays (barangay_name) VALUES ($1)',
                [barangay]
            );
        }
        console.log('✅ Inserted barangay data');

        const result = await schedulingPool.query('SELECT * FROM barangays');
        console.log('Current barangays in database:', result.rows);

        console.log('✅ Database initialization completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase(); 