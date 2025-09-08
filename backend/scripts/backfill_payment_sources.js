/*
  Backfill script to link payment_sources -> invoices and finalize payment flows.
  - Links payment_sources.invoice_id using subscription_id found in redirect URLs
  - Matches latest unpaid invoice for that subscription (closest by created_at)
  - For sources already marked 'completed', re-run updatePaymentStatus to create payment,
    mark invoice paid, and activate subscription.
*/

const { pool } = require('../config/db');
const billingModel = require('../models/billingModel');

const extractSubscriptionId = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.searchParams.get('subscription_id') || u.searchParams.get('subscriptionId');
  } catch (e) {
    return null;
  }
};

(async () => {
  console.log('🔧 Starting backfill for payment_sources.invoice_id ...');
  const client = await pool.connect();
  try {
    // 1) Fetch candidate payment_sources without invoice_id
    const { rows: sources } = await client.query(
      `SELECT source_id, invoice_id, amount, status, redirect_success, created_at
       FROM payment_sources
       WHERE invoice_id IS NULL
       ORDER BY created_at DESC`
    );

    console.log(`📦 Found ${sources.length} payment_sources without invoice_id`);

    let linked = 0;
    for (const src of sources) {
      const subId = extractSubscriptionId(src.redirect_success);
      if (!subId) continue;

      // Find latest unpaid invoice for this subscription
      const { rows: inv } = await client.query(
        `SELECT invoice_id, created_at, amount, status
         FROM invoices
         WHERE subscription_id = $1 AND status = 'unpaid'
         ORDER BY created_at DESC
         LIMIT 1`,
        [subId]
      );

      if (inv.length === 0) continue;

      // Link the payment_source to this invoice
      const { rows: upd } = await client.query(
        `UPDATE payment_sources
         SET invoice_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE source_id = $2 AND invoice_id IS NULL
         RETURNING source_id, invoice_id`,
        [inv[0].invoice_id, src.source_id]
      );

      if (upd.length > 0) {
        linked++;
        console.log(`🔗 Linked source ${src.source_id} -> invoice ${inv[0].invoice_id}`);
      }
    }

    console.log(`✅ Linking complete. Linked ${linked} sources.`);

    // 2) For completed sources, re-run updatePaymentStatus to trigger downstream effects
    const { rows: completed } = await client.query(
      `SELECT source_id FROM payment_sources
       WHERE status = 'completed' AND invoice_id IS NOT NULL
       ORDER BY updated_at DESC`
    );

    console.log(`🔄 Reprocessing ${completed.length} completed sources to ensure invoice/subscription updates ...`);
    for (const row of completed) {
      try {
        await billingModel.updatePaymentStatus(row.source_id, 'completed', { reason: 'backfill' });
        console.log(`🧾 Reprocessed source ${row.source_id}`);
      } catch (e) {
        console.warn(`⚠️ Failed to reprocess source ${row.source_id}: ${e.message}`);
      }
    }

    console.log('🏁 Backfill finished.');
  } catch (e) {
    console.error('💥 Backfill error:', e);
  } finally {
    client.release();
    process.exit(0);
  }
})();
