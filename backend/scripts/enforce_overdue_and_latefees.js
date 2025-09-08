#!/usr/bin/env node
/**
 * Enforce invoice overdue status and apply late fees after grace period.
 * Policy:
 * - Grace period: 3 days after due_date (service continues; no fee)
 * - Late fee: flat ₱20 applied once when invoice becomes overdue
 * - Overdue definition here: due_date + 3 days < today
 *
 * Usage: node backend/scripts/enforce_overdue_and_latefees.js
 */

const { pool } = require('../config/db');

const GRACE_DAYS = 3;
const LATE_FEE = 20; // pesos

async function enforceOverdueAndLateFees() {
  const client = await pool.connect();
  try {
    console.log('⏳ Starting overdue/late-fee enforcement…');
    await client.query('BEGIN');

    // Mark invoices overdue after grace period
    const markOverdueSql = `
      UPDATE invoices i
      SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
      WHERE (i.status = 'unpaid' OR i.status = 'partially_paid')
        AND (CURRENT_DATE > i.due_date + INTERVAL '${GRACE_DAYS} days')
        AND i.status <> 'overdue'
      RETURNING i.invoice_id, i.invoice_number, i.user_id, i.due_date
    `;

    const overdueRes = await client.query(markOverdueSql);
    console.log(`🧾 Marked ${overdueRes.rowCount} invoice(s) as overdue after ${GRACE_DAYS}-day grace.`);

    // Apply flat late fee once when invoice becomes overdue (only if not already set)
    const applyLateFeeSql = `
      UPDATE invoices i
      SET late_fees = CASE WHEN COALESCE(i.late_fees, 0) = 0 THEN $1 ELSE i.late_fees END,
          updated_at = CURRENT_TIMESTAMP
      WHERE i.status = 'overdue'
        AND (CURRENT_DATE > i.due_date + INTERVAL '${GRACE_DAYS} days')
        AND COALESCE(i.late_fees, 0) = 0
      RETURNING i.invoice_id, i.invoice_number, i.user_id, i.late_fees
    `;

    const feeRes = await client.query(applyLateFeeSql, [LATE_FEE]);
    console.log(`💸 Applied late fee to ${feeRes.rowCount} overdue invoice(s) (₱${LATE_FEE}).`);

    await client.query('COMMIT');
    console.log('✅ Overdue/late-fee enforcement completed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during enforcement:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    // Let node exit
  }
}

if (require.main === module) {
  enforceOverdueAndLateFees();
}

module.exports = { enforceOverdueAndLateFees };
