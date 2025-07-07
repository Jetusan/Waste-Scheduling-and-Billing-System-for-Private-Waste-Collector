const fs = require('fs');
const path = require('path');
const { schedulingPool } = require('./db');

async function runMigration() {
    try {
        console.log('Starting migration...');
        
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'migration.sql'),
            'utf8'
        );

        // Execute the migration
        await schedulingPool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during migration:', error);
        process.exit(1);
    }
}

runMigration(); 