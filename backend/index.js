const dotenv = require('dotenv');
const app = require('./app');
const pool = require('./config/db');

dotenv.config();
const PORT = process.env.PORT || 5000;

// Test database connection
pool.connect()
    .then(() => {
        console.log('✅ Database connected successfully!');
    })
    .catch(err => {
        console.error('❌ Database connection error:', err);
    });

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
});