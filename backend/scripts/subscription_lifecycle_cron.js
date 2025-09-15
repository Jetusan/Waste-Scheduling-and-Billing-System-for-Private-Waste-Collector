// subscription_lifecycle_cron.js
// Runs daily lifecycle tasks: mark overdue invoices, suspend/cancel overdue subscriptions,
// and generate monthly invoices for active subscriptions.

const { pool } = require('../config/db');

function log(section, message, extra = null) {
  const ts = new Date().toISOString();
  if (extra) {
    console.log(`[${ts}] [${section}] ${message} ->`, extra);
  } else {
    console.log(`[${ts}] [${section}] ${message}`);
  }
}

async function markOverdueInvoices() {
  log('INVOICES', 'Marking overdue invoices...');
  const sql = `
    UPDATE invoices
    SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'unpaid' AND due_date < CURRENT_DATE;
  `;
  const res = await pool.query(sql);
  log('INVOICES', 'Overdue invoices updated', { rowCount: res.rowCount });
}

async function suspendOverdueSubscriptions() {
  log('SUBSCRIPTIONS', 'Suspending subscriptions past grace period...');
  const sql = `
    UPDATE customer_subscriptions
    SET status = 'suspended', suspended_at = COALESCE(suspended_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active' AND grace_period_end IS NOT NULL AND grace_period_end < CURRENT_DATE;
  `;
  const res = await pool.query(sql);
  log('SUBSCRIPTIONS', 'Active -> Suspended updates', { rowCount: res.rowCount });
}

async function cancelLongSuspended() {
  log('SUBSCRIPTIONS', 'Cancelling long-suspended subscriptions (30+ days)...');
  const sql = `
    UPDATE customer_subscriptions
    SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE status = 'suspended' AND suspended_at IS NOT NULL AND suspended_at < (CURRENT_DATE - INTERVAL '30 days');
  `;
  const res = await pool.query(sql);
  log('SUBSCRIPTIONS', 'Suspended -> Cancelled updates', { rowCount: res.rowCount });
}

async function generateMonthlyInvoices() {
  log('BILLING', 'Generating monthly invoices where due...');
  // This assumes next_billing_date is maintained on subscriptions.
  // Creates an invoice for any active subscription that is due today or earlier and has no unpaid invoice created today.
  const sql = `
    WITH due_subs AS (
      SELECT cs.subscription_id, cs.user_id, cs.plan_id
      FROM customer_subscriptions cs
      WHERE cs.status = 'active' AND cs.next_billing_date IS NOT NULL AND cs.next_billing_date <= CURRENT_DATE
    ),
    to_create AS (
      SELECT d.subscription_id, d.user_id, d.plan_id
      FROM due_subs d
      WHERE NOT EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.user_id = d.user_id
          AND i.subscription_id = d.subscription_id
          AND i.status IN ('unpaid','overdue','partially_paid')
          AND DATE(i.created_at) = CURRENT_DATE
      )
    )
    INSERT INTO invoices (user_id, subscription_id, plan_id, amount, status, due_date, notes)
    SELECT t.user_id, t.subscription_id, t.plan_id,
           COALESCE(sp.price, 199) AS amount,
           'unpaid' AS status,
           (CURRENT_DATE + INTERVAL '30 days')::date AS due_date,
           'Automated monthly invoice'
    FROM to_create t
    LEFT JOIN subscription_plans sp ON sp.plan_id = t.plan_id
    RETURNING invoice_id;
  `;
  try {
    const res = await pool.query(sql);
    log('BILLING', 'Monthly invoices created', { rowCount: res.rowCount });
  } catch (e) {
    // If schema differs, just log and continue
    log('BILLING', 'Monthly invoice generation skipped due to schema mismatch', { error: e.message });
  }
}

async function bumpNextBillingDates() {
  // Optional: bump next_billing_date by ~1 month for processed subs.
  const sql = `
    UPDATE customer_subscriptions cs
    SET next_billing_date = (CURRENT_DATE + INTERVAL '1 month')::date,
        billing_cycle_count = COALESCE(cs.billing_cycle_count, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE cs.status = 'active' AND cs.next_billing_date IS NOT NULL AND cs.next_billing_date <= CURRENT_DATE;
  `;
  try {
    const res = await pool.query(sql);
    log('SUBSCRIPTIONS', 'Advanced next_billing_date for active subs', { rowCount: res.rowCount });
  } catch (e) {
    log('SUBSCRIPTIONS', 'Skipping next_billing_date bump (schema mismatch?)', { error: e.message });
  }
}

async function main() {
  const start = Date.now();
  log('CRON', 'Starting subscription lifecycle tasks');
  try {
    await markOverdueInvoices();
    await suspendOverdueSubscriptions();
    await cancelLongSuspended();
    await generateMonthlyInvoices();
    await bumpNextBillingDates();
    log('CRON', 'All tasks completed');
  } catch (err) {
    log('CRON', 'Error running lifecycle tasks', { error: err.message, stack: err.stack });
    process.exitCode = 1;
  } finally {
    await pool.end();
    const ms = Date.now() - start;
    log('CRON', `Finished in ${ms}ms`);
  }
}

if (require.main === module) {
  main();
}
