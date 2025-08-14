
const { pool } = require('../config/db');

const dropLandmarkColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE addresses DROP COLUMN landmark CASCADE');
    console.log('Column landmark dropped from addresses table');
  } catch (error) {
    console.error('Error dropping landmark column:', error);
  } finally {
    client.release();
  }
};

dropLandmarkColumn();
