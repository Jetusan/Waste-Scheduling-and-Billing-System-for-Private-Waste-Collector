const { query } = require('../config/db');

async function getFunctionDefinition() {
  try {
    const result = await query(`SELECT pg_get_functiondef('create_special_pickup_invoice(integer)'::regprocedure) AS def`);
    console.log(result.rows[0].def);
    process.exit(0);
  } catch (err) {
    console.error('Error fetching function definition:', err);
    process.exit(1);
  }
}

getFunctionDefinition();
