// testBarangay.js
const db = require('./config/db'); // Correct path

async function getAllBarangays() {
  try {
    const result = await db.query('SELECT * FROM barangays');
    if (result.rows.length > 0) {
      console.log('All Barangays:');
      result.rows.forEach(row => {
        console.log(row.barangay_name);
      });
    } else {
      console.log('No barangays found.');
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    db.pool.end(); // Close connection
  }
}

getAllBarangays();