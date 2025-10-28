const pool = require('../config/dbAdmin');

// Subscription Plans
const getAllSubscriptionPlans = async () => {
  // Prefer active plans if status column is used; otherwise, fall back to all plans
  const activeQuery = 'SELECT * FROM subscription_plans WHERE status = $1 ORDER BY plan_name';
  try {
    const activeResult = await pool.query(activeQuery, ['active']);
    if (activeResult.rows && activeResult.rows.length > 0) return activeResult.rows;
  } catch (e) {
    // If the status column doesn't exist or query fails, fall through to full fetch
  }
  const allQuery = 'SELECT * FROM subscription_plans ORDER BY plan_name';
  const allResult = await pool.query(allQuery);
  return allResult.rows;
};

const getSubscriptionPlanById = async (planId) => {
  const query = 'SELECT * FROM subscription_plans WHERE plan_id = $1';
  const result = await pool.query(query, [planId]);
  return result.rows[0];
};

const createSubscriptionPlan = async (planData) => {
  const { plan_name, price, frequency, description } = planData;
  const query = `
    INSERT INTO subscription_plans (plan_name, price, frequency, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await pool.query(query, [plan_name, price, frequency, description]);
  return result.rows[0];
};

// Customer Subscriptions
const getAllCustomerSubscriptions = async () => {
  const query = `
    SELECT 
      cs.*,
      u.user_id,
      u.username,
      u.contact_number,
      sp.plan_name,
      sp.price,
      sp.frequency
    FROM customer_subscriptions cs
    JOIN users u ON cs.user_id = u.user_id
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE cs.status = 'active'
    ORDER BY cs.created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getCustomerSubscriptionById = async (subscriptionId) => {
  const query = `
    SELECT 
      cs.*,
      u.user_id,
      u.username,
      u.contact_number,
      sp.plan_name,
      sp.price,
      sp.frequency
    FROM customer_subscriptions cs
    JOIN users u ON cs.user_id = u.user_id
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE cs.subscription_id = $1
  `;
  const result = await pool.query(query, [subscriptionId]);
  return result.rows[0];
};

const createCustomerSubscription = async (subscriptionData) => {
  const { user_id, plan_id, billing_start_date, payment_method } = subscriptionData;
  
  // Calculate next billing date (30 days from start)
  const nextBillingDate = new Date(billing_start_date);
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);
  
  // Calculate grace period end (7 days after next billing)
  const gracePeriodEnd = new Date(nextBillingDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
  
  // Determine initial status based on payment method
  const initialStatus = payment_method.toLowerCase() === 'gcash' ? 'pending_payment' : 'pending_payment';
  const paymentStatus = 'pending';
  
  const query = `
    INSERT INTO customer_subscriptions (
      user_id, plan_id, billing_start_date, payment_method, 
      status, payment_status, subscription_created_at, next_billing_date, grace_period_end,
      billing_cycle_count
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, 0)
    RETURNING *
  `;
  const result = await pool.query(query, [
    user_id, plan_id, billing_start_date, payment_method, 
    initialStatus, paymentStatus, nextBillingDate.toISOString().split('T')[0], 
    gracePeriodEnd.toISOString().split('T')[0]
  ]);
  return result.rows[0];
};

// Invoices
const getAllInvoices = async (filters = {}) => {
  // Fetch invoices and join users for username and plans for plan_name
  const query = `
    SELECT 
      i.*, 
      u.username,
      sp.plan_name
    FROM invoices i
    LEFT JOIN users u ON i.user_id = u.user_id
    LEFT JOIN subscription_plans sp ON i.plan_id = sp.plan_id
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getInvoiceById = async (invoiceId) => {
  const query = `
    SELECT 
      i.*,
      u.username,
      u.contact_number,
      sp.plan_name,
      sp.price,
      sp.frequency
    FROM invoices i
    JOIN users u ON i.user_id = u.user_id
    JOIN subscription_plans sp ON i.plan_id = sp.plan_id
    WHERE i.invoice_id = $1
  `;
  const result = await pool.query(query, [invoiceId]);
  return result.rows[0];
};

const createInvoice = async (invoiceData) => {
  const { user_id, plan_id, due_date, generated_date, notes, amount, subscription_id } = invoiceData;
  
  // Generate invoice number
  const invoiceNumberQuery = 'SELECT COUNT(*) + 1 as next_number FROM invoices';
  const invoiceNumberResult = await pool.query(invoiceNumberQuery);
  const invoiceNumber = `INV-${String(invoiceNumberResult.rows[0].next_number).padStart(3, '0')}`;

  // Get plan price if amount not provided
  let invoiceAmount = amount;
  if (!invoiceAmount) {
    const planQuery = 'SELECT price FROM subscription_plans WHERE plan_id = $1';
    const planResult = await pool.query(planQuery, [plan_id]);
    invoiceAmount = planResult.rows[0]?.price || 0;
  }

  const query = `
    INSERT INTO invoices (invoice_number, user_id, plan_id, subscription_id, due_date, generated_date, notes, amount)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await pool.query(query, [invoiceNumber, user_id, plan_id, subscription_id, due_date, generated_date, notes, invoiceAmount]);
  return result.rows[0];
};

const updateInvoiceStatus = async (invoiceId, status) => {
  const query = 'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = $2 RETURNING *';
  const result = await pool.query(query, [status, invoiceId]);
  return result.rows[0];
};

const addLateFees = async (invoiceId, lateFees) => {
  const query = 'UPDATE invoices SET late_fees = $1, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = $2 RETURNING *';
  const result = await pool.query(query, [lateFees, invoiceId]);
  return result.rows[0];
};

// Payments
const getPaymentsByInvoiceId = async (invoiceId) => {
  const query = `
    SELECT 
      p.*,
      c.collector_id,
      u.username as collector_username,
      u.contact_number as collector_phone
    FROM payments p
    LEFT JOIN collectors c ON p.collector_id = c.collector_id
    LEFT JOIN users u ON c.user_id = u.user_id
    WHERE p.invoice_id = $1
    ORDER BY p.payment_date DESC
  `;
  const result = await pool.query(query, [invoiceId]);
  return result.rows;
};

const createPayment = async (paymentData) => {
  const { invoice_id, amount, payment_method, payment_date, reference_number, collector_id, notes } = paymentData;
  
  const query = `
    INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, collector_id, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const result = await pool.query(query, [invoice_id, amount, payment_method, payment_date, reference_number, collector_id, notes]);
  
  // Update invoice status based on total payments
  await updateInvoiceStatusBasedOnPayments(invoice_id);
  
  return result.rows[0];
};

const updateInvoiceStatusBasedOnPayments = async (invoiceId) => {
  const invoiceQuery = 'SELECT amount, late_fees FROM invoices WHERE invoice_id = $1';
  const invoiceResult = await pool.query(invoiceQuery, [invoiceId]);
  
  if (invoiceResult.rows.length === 0) return;
  
  const totalAmount = parseFloat(invoiceResult.rows[0].amount) + parseFloat(invoiceResult.rows[0].late_fees || 0);
  
  const paymentsQuery = 'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = $1';
  const paymentsResult = await pool.query(paymentsQuery, [invoiceId]);
  const totalPaid = parseFloat(paymentsResult.rows[0].total_paid);
  
  let status = 'unpaid';
  if (totalPaid >= totalAmount) {
    status = 'paid';
  } else if (totalPaid > 0) {
    status = 'partially_paid';
  }
  
  await updateInvoiceStatus(invoiceId, status);
};

// Billing History/Transactions
const getBillingHistory = async (filters = {}) => {
  let query = `
    SELECT 
      i.invoice_id as transaction_id,
      i.invoice_number as invoice_id,
      COALESCE(u.username, 'Unknown User') as subscriber,
      COALESCE(sp.plan_name, 'Unknown Plan') as plan,
      i.amount,
      COALESCE(i.created_at, i.due_date) as payment_date,
      CASE 
        WHEN i.status = 'paid' THEN 'GCash'
        WHEN i.status = 'unpaid' THEN 'Pending'
        ELSE 'Invoice'
      END as payment_method,
      CASE 
        WHEN i.status = 'paid' THEN 'Completed'
        WHEN i.status = 'unpaid' THEN 'Pending'
        WHEN i.status = 'overdue' THEN 'Overdue'
        ELSE 'Unknown'
      END as status,
      COALESCE(i.notes, 'Generated from subscription') as notes,
      i.invoice_number as reference_number,
      NULL as collector_name,
      COALESCE(u.contact_number, 'N/A') as phone,
      'N/A' as address,
      'N/A' as email
    FROM invoices i
    LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
    LEFT JOIN users u ON cs.user_id = u.user_id
    LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
  `;

  const whereConditions = [];
  const queryParams = [];
  let paramCount = 0;

  if (filters.dateFrom) {
    paramCount++;
    whereConditions.push(`DATE(i.created_at) >= $${paramCount}`);
    queryParams.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    paramCount++;
    whereConditions.push(`DATE(i.created_at) <= $${paramCount}`);
    queryParams.push(filters.dateTo);
  }

  if (filters.plan && filters.plan !== 'All Plans') {
    paramCount++;
    whereConditions.push(`sp.plan_name = $${paramCount}`);
    queryParams.push(filters.plan);
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'All Methods') {
    paramCount++;
    if (filters.paymentMethod === 'GCash') {
      whereConditions.push(`i.status = 'paid'`);
    } else if (filters.paymentMethod === 'Pending') {
      whereConditions.push(`i.status = 'unpaid'`);
    }
  }

  if (filters.status && filters.status !== 'All Status') {
    paramCount++;
    let statusFilter = filters.status.toLowerCase();
    if (statusFilter === 'completed') statusFilter = 'paid';
    if (statusFilter === 'pending') statusFilter = 'unpaid';
    whereConditions.push(`i.status = $${paramCount}`);
    queryParams.push(statusFilter);
  }

  if (whereConditions.length > 0) {
    query += ' WHERE ' + whereConditions.join(' AND ');
  }

  query += ' ORDER BY i.created_at DESC';

  const result = await pool.query(query, queryParams);
  return result.rows;
};

// Auto-generate invoices for active subscriptions
const generateMonthlyInvoices = async () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const query = `
    SELECT 
      cs.subscription_id,
      cs.user_id,
      sp.plan_name,
      sp.price,
      sp.frequency
    FROM customer_subscriptions cs
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE cs.status = 'active' 
    AND sp.frequency = 'monthly'
    AND cs.billing_start_date <= $1
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.subscription_id = cs.subscription_id 
      AND i.generated_date >= $2
      AND i.status = 'unpaid'
    )
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.subscription_id = cs.subscription_id 
      AND DATE(i.created_at) = CURRENT_DATE
    )
  `;
  
  const result = await pool.query(query, [today, firstDayOfMonth]);
  
  const newInvoices = [];
  for (const subscription of result.rows) {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days
    
    const invoiceData = {
      subscription_id: subscription.subscription_id,
      amount: subscription.price,
      due_date: dueDate.toISOString().split('T')[0],
      generated_date: today.toISOString().split('T')[0],
      notes: `Monthly invoice for ${subscription.plan_name} plan`
    };
    
    const newInvoice = await createInvoice(invoiceData);
    newInvoices.push(newInvoice);
  }
  
  return newInvoices;
};

// Enhanced subscription status management
const activateSubscription = async (subscriptionId, paymentData = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update subscription status to active with enhanced fields
    const updateSubscriptionQuery = `
      UPDATE customer_subscriptions 
      SET status = 'active', 
          payment_status = 'paid',
          payment_confirmed_at = CURRENT_TIMESTAMP,
          last_payment_date = CURRENT_DATE,
          billing_cycle_count = billing_cycle_count + 1,
          reactivated_at = CASE WHEN status IN ('suspended', 'cancelled') THEN CURRENT_TIMESTAMP ELSE reactivated_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = $1
      RETURNING *
    `;
    const subscriptionResult = await client.query(updateSubscriptionQuery, [subscriptionId]);
    
    if (subscriptionResult.rows.length === 0) {
      throw new Error('Subscription not found');
    }
    
    const subscription = subscriptionResult.rows[0];
    
    // Update next billing date
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    
    const updateBillingQuery = `
      UPDATE customer_subscriptions 
      SET next_billing_date = $1,
          grace_period_end = $2
      WHERE subscription_id = $3
    `;
    const gracePeriodEnd = new Date(nextBillingDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
    
    await client.query(updateBillingQuery, [
      nextBillingDate.toISOString().split('T')[0],
      gracePeriodEnd.toISOString().split('T')[0],
      subscriptionId
    ]);
    
    // Resolve a single target invoice to mark as paid
    const targetInvoiceQuery = `
      SELECT invoice_id 
      FROM invoices 
      WHERE subscription_id = $1 
        AND status IN ('unpaid', 'partially_paid', 'overdue')
      ORDER BY COALESCE(due_date, created_at) DESC, created_at DESC
      LIMIT 1
    `;
    const targetInvoiceRes = await client.query(targetInvoiceQuery, [subscriptionId]);
    const targetInvoiceId = targetInvoiceRes.rows[0]?.invoice_id || null;
    
    if (targetInvoiceId) {
      const updateInvoiceQuery = `
        UPDATE invoices 
        SET status = 'paid', updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id = $1
        RETURNING invoice_id
      `;
      await client.query(updateInvoiceQuery, [targetInvoiceId]);
    }
    
    // Create payment record if payment data provided
    if (paymentData && targetInvoiceId) {
      const { amount, payment_method, reference_number, notes } = paymentData;
      const createPaymentQuery = `
        INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
        RETURNING *
      `;
      await client.query(createPaymentQuery, [targetInvoiceId, amount, payment_method, reference_number, notes]);
    }
    
    await client.query('COMMIT');
    return subscription;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Cancel latest non-cancelled subscription for a user
const cancelSubscriptionByUserId = async (userId, reason = 'User requested cancellation') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find latest subscription that is not already cancelled
    const findQuery = `
      SELECT subscription_id, status
      FROM customer_subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const subRes = await client.query(findQuery, [userId]);
    if (subRes.rows.length === 0) {
      throw new Error('No subscription found for user');
    }

    const sub = subRes.rows[0];
    if (sub.status === 'cancelled') {
      await client.query('COMMIT');
      return {
        ...sub,
        alreadyCancelled: true
      };
    }

    const updateQuery = `
      UPDATE customer_subscriptions
      SET status = 'cancelled',
          cancelled_at = CURRENT_TIMESTAMP,
          cancellation_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = $2
      RETURNING *
    `;
    const updRes = await client.query(updateQuery, [reason, sub.subscription_id]);

    await client.query('COMMIT');
    return updRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getSubscriptionByUserId = async (userId) => {
  const query = `
    SELECT 
      cs.*,
      sp.plan_name,
      sp.price,
      sp.frequency,
      sp.description
    FROM customer_subscriptions cs
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE cs.user_id = $1
    ORDER BY cs.created_at DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

// New function: Get only active subscriptions
const getActiveSubscriptionByUserId = async (userId) => {
  const query = `
    SELECT 
      cs.*,
      sp.plan_name,
      sp.price,
      sp.frequency,
      sp.description
    FROM customer_subscriptions cs
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE cs.user_id = $1 AND cs.status = 'active'
    ORDER BY cs.created_at DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

// New function: Expire overdue subscriptions
const expireOverdueSubscriptions = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Mark subscriptions as suspended after grace period
    const suspendQuery = `
      UPDATE customer_subscriptions 
      SET status = 'suspended',
          suspended_at = CURRENT_TIMESTAMP,
          suspension_reason = 'Payment overdue - grace period expired'
      WHERE status = 'active' 
        AND grace_period_end < CURRENT_DATE
        AND suspended_at IS NULL
      RETURNING subscription_id, user_id
    `;
    const suspendedResult = await client.query(suspendQuery);
    
    // Mark subscriptions as cancelled after 30 days of suspension
    const cancelQuery = `
      UPDATE customer_subscriptions 
      SET status = 'cancelled',
          cancelled_at = CURRENT_TIMESTAMP,
          cancellation_reason = 'Extended non-payment - auto-cancelled'
      WHERE status = 'suspended' 
        AND suspended_at < CURRENT_DATE - INTERVAL '30 days'
        AND cancelled_at IS NULL
      RETURNING subscription_id, user_id
    `;
    const cancelledResult = await client.query(cancelQuery);
    
    await client.query('COMMIT');
    
    return {
      suspended: suspendedResult.rows,
      cancelled: cancelledResult.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// New function: Reactivate subscription for re-subscription
const reactivateSubscription = async (userId, paymentData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find the most recent subscription for this user
    const findSubscriptionQuery = `
      SELECT * FROM customer_subscriptions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const subResult = await client.query(findSubscriptionQuery, [userId]);
    
    if (subResult.rows.length === 0) {
      throw new Error('No subscription found for user');
    }
    
    const subscription = subResult.rows[0];
    
    // Reactivate the subscription
    const reactivateQuery = `
      UPDATE customer_subscriptions 
      SET status = 'active',
          payment_status = 'paid',
          payment_confirmed_at = CURRENT_TIMESTAMP,
          last_payment_date = CURRENT_DATE,
          reactivated_at = CURRENT_TIMESTAMP,
          billing_cycle_count = billing_cycle_count + 1,
          next_billing_date = CURRENT_DATE + INTERVAL '30 days',
          grace_period_end = CURRENT_DATE + INTERVAL '37 days',
          updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = $1
      RETURNING *
    `;
    const reactivatedResult = await client.query(reactivateQuery, [subscription.subscription_id]);
    
    await client.query('COMMIT');
    return reactivatedResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateSubscriptionPaymentStatus = async (subscriptionId, paymentStatus) => {
  const query = `
    UPDATE customer_subscriptions 
    SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE subscription_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [paymentStatus, subscriptionId]);
  return result.rows[0];
};

// Payment Source Tracking for GCash/PayMongo
const createPaymentSource = async (sourceData) => {
  const { 
    source_id, 
    invoice_id, 
    amount, 
    currency = 'PHP', 
    payment_method = 'gcash', 
    checkout_url,
    redirect_success,
    redirect_failed 
  } = sourceData;
  
  const query = `
    INSERT INTO payment_sources (
      source_id, invoice_id, amount, currency, payment_method, 
      checkout_url, redirect_success, redirect_failed, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    source_id, invoice_id, amount, currency, payment_method,
    checkout_url, redirect_success, redirect_failed, 'pending'
  ]);
  
  return result.rows[0];
};

const updatePaymentStatus = async (sourceId, status, webhookData = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log(`🔔 [BillingModel] updatePaymentStatus START sourceId=${sourceId} -> status=${status}`);
    const query = `
      UPDATE payment_sources 
      SET status = $1, webhook_data = $2, updated_at = CURRENT_TIMESTAMP
      WHERE source_id = $3
      RETURNING *
    `;
    
    const result = await client.query(query, [status, webhookData, sourceId]);
    
    if (result.rows.length === 0) {
      console.warn(`⚠️ [BillingModel] No payment_source found for sourceId=${sourceId}`);
    } else {
      console.log(`✅ [BillingModel] payment_sources updated: sourceId=${sourceId}, status=${status}`);
    }
    
    // If payment completed, also create a payment record and activate subscription
    if (status === 'completed' && result.rows.length > 0) {
      let paymentSource = result.rows[0];
      console.log(`🔗 [BillingModel] Linking source -> invoice: sourceId=${sourceId}, invoice_id=${paymentSource.invoice_id}`);

      // Fallback: if invoice_id is null, try to resolve to latest unpaid invoice created today
      if (!paymentSource.invoice_id) {
        console.warn(`⚠️ [BillingModel] payment_source has NULL invoice_id. Attempting to resolve to latest unpaid invoice created today...`);
        try {
          const resolveRes = await client.query(
            `WITH candidate AS (
               SELECT invoice_id 
               FROM invoices 
               WHERE status = 'unpaid' AND DATE(created_at) = CURRENT_DATE 
               ORDER BY created_at DESC 
               LIMIT 1
             )
             UPDATE payment_sources ps
             SET invoice_id = c.invoice_id, updated_at = CURRENT_TIMESTAMP
             FROM candidate c
             WHERE ps.source_id = $1 AND ps.invoice_id IS NULL
             RETURNING ps.*`,
            [sourceId]
          );
          if (resolveRes.rows.length > 0) {
            paymentSource = resolveRes.rows[0];
            console.log(`✅ [BillingModel] Fallback linked source to invoice_id=${paymentSource.invoice_id}`);
          } else {
            console.warn(`⚠️ [BillingModel] No suitable unpaid invoice found for fallback linking. Skipping invoice and subscription updates.`);
          }
        } catch (e) {
          console.error(`💥 [BillingModel] Error during fallback invoice linking:`, e);
        }
      }
      
      // Create payment record
      const paymentData = {
        invoice_id: paymentSource.invoice_id,
        amount: paymentSource.amount / 100, // Convert from centavos to pesos
        payment_method: 'GCash',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: sourceId,
        notes: 'Payment via GCash/PayMongo'
      };
      
      const createPaymentQuery = `
        INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const paymentInsert = await client.query(createPaymentQuery, [
        paymentData.invoice_id, 
        paymentData.amount, 
        paymentData.payment_method, 
        paymentData.payment_date, 
        paymentData.reference_number, 
        paymentData.notes
      ]);
      const createdPayment = paymentInsert.rows[0];
      console.log(`💰 [BillingModel] Payment recorded payment_id=${createdPayment.payment_id} amount=${createdPayment.amount} method=${createdPayment.payment_method}`);
      
      // Update invoice status to paid (only if we have an invoice_id)
      if (paymentSource.invoice_id) {
        const invoiceUpdate = await client.query(
          'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = $2 RETURNING invoice_id, status',
          ['paid', paymentSource.invoice_id]
        );
        console.log(`🧾 [BillingModel] Invoice updated invoice_id=${invoiceUpdate.rows[0]?.invoice_id} status=${invoiceUpdate.rows[0]?.status}`);
      }
      
      // Determine subscription_id for logging
      let subscriptionId = null;
      if (paymentSource.invoice_id) {
        const subIdResult = await client.query('SELECT subscription_id FROM invoices WHERE invoice_id = $1', [paymentSource.invoice_id]);
        subscriptionId = subIdResult.rows[0]?.subscription_id;
      }
      console.log(`📦 [BillingModel] Resolving subscription to activate subscription_id=${subscriptionId}`);
      
      // Activate the subscription
      const activateSubscriptionQuery = `
        UPDATE customer_subscriptions 
        SET status = 'active', 
            payment_status = 'paid',
            payment_confirmed_at = CURRENT_TIMESTAMP,
            last_payment_date = CURRENT_DATE,
            billing_cycle_count = billing_cycle_count + 1,
            reactivated_at = CASE WHEN status IN ('suspended', 'cancelled') THEN CURRENT_TIMESTAMP ELSE reactivated_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = (
          SELECT subscription_id FROM invoices WHERE invoice_id = $1
        )
        RETURNING subscription_id, status, payment_status, payment_confirmed_at
      `;
      if (paymentSource.invoice_id) {
        const subUpdate = await client.query(activateSubscriptionQuery, [paymentSource.invoice_id]);
        const subRow = subUpdate.rows[0];
        console.log(`📬 [BillingModel] Subscription activated subscription_id=${subRow?.subscription_id} status=${subRow?.status} payment_status=${subRow?.payment_status} confirmed_at=${subRow?.payment_confirmed_at}`);
      }
    }
    
    await client.query('COMMIT');
    console.log(`🏁 [BillingModel] updatePaymentStatus DONE sourceId=${sourceId} -> status=${status}`);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`💥 [BillingModel] updatePaymentStatus ERROR sourceId=${sourceId} -> status=${status}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

const getPaymentStatus = async (sourceId) => {
  const query = 'SELECT status FROM payment_sources WHERE source_id = $1';
  const result = await pool.query(query, [sourceId]);
  
  if (result.rows.length === 0) {
    return 'not_found';
  }
  
  return result.rows[0].status;
};

const getPaymentSourceById = async (sourceId) => {
  const query = 'SELECT * FROM payment_sources WHERE source_id = $1';
  const result = await pool.query(query, [sourceId]);
  return result.rows[0];
};

// Get pending cash subscriptions for collectors
const getPendingCashSubscriptions = async () => {
  const query = `
    SELECT 
      cs.subscription_id,
      cs.payment_method,
      cs.subscription_created_at,
      u.user_id,
      u.username as resident_name,
      u.contact_number,
      u.email,
      sp.plan_name,
      sp.price,
      'Address not provided' as address
    FROM customer_subscriptions cs
    JOIN users u ON cs.user_id = u.user_id
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE cs.status = 'pending_payment' 
    AND cs.payment_status = 'pending'
    AND LOWER(cs.payment_method) = 'cash'
    ORDER BY cs.subscription_created_at ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

// Renewal function for active subscriptions
const renewActiveSubscription = async (userId, paymentMethod) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get active subscription
    const subscriptionQuery = `
      SELECT cs.*, sp.price, sp.plan_name 
      FROM customer_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE cs.user_id = $1 AND cs.status = 'active'
      ORDER BY cs.created_at DESC
      LIMIT 1
    `;
    const subscriptionResult = await client.query(subscriptionQuery, [userId]);
    
    if (subscriptionResult.rows.length === 0) {
      throw new Error('No active subscription found for renewal');
    }
    
    const subscription = subscriptionResult.rows[0];
    
    // Check if user already has an unpaid invoice for next billing cycle
    const existingInvoiceQuery = `
      SELECT invoice_id 
      FROM invoices 
      WHERE subscription_id = $1 
        AND status IN ('unpaid', 'partially_paid')
        AND due_date > CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const existingInvoiceResult = await client.query(existingInvoiceQuery, [subscription.subscription_id]);
    
    if (existingInvoiceResult.rows.length > 0) {
      // Return existing renewal invoice
      const invoiceQuery = `
        SELECT * FROM invoices WHERE invoice_id = $1
      `;
      const invoiceResult = await client.query(invoiceQuery, [existingInvoiceResult.rows[0].invoice_id]);
      
      await client.query('COMMIT');
      return {
        subscription,
        invoice: invoiceResult.rows[0],
        isExistingRenewal: true
      };
    }
    
    // Calculate next billing period dates
    const currentDate = new Date();
    const nextBillingDate = new Date(subscription.next_billing_date || currentDate);
    if (nextBillingDate <= currentDate) {
      nextBillingDate.setDate(currentDate.getDate() + 30);
    }
    
    const dueDate = new Date(nextBillingDate);
    dueDate.setDate(dueDate.getDate() + 15); // Due 15 days after billing date
    
    // Create renewal invoice
    const invoiceNumber = `REN-${Date.now().toString().slice(-8)}${userId}`;
    const createInvoiceQuery = `
      INSERT INTO invoices (
        invoice_number, 
        user_id, 
        subscription_id, 
        plan_id,
        amount, 
        status, 
        due_date,
        generated_date,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, 'unpaid', $6, $7, $8)
      RETURNING *
    `;
    
    const invoiceResult = await client.query(createInvoiceQuery, [
      invoiceNumber,
      userId,
      subscription.subscription_id,
      subscription.plan_id,
      subscription.price,
      dueDate.toISOString().split('T')[0],
      currentDate.toISOString().split('T')[0],
      `Renewal invoice for ${subscription.plan_name} - Next billing cycle`
    ]);
    
    // Update subscription with renewal info
    const updateSubscriptionQuery = `
      UPDATE customer_subscriptions 
      SET payment_method = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = $2
      RETURNING *
    `;
    const updatedSubscriptionResult = await client.query(updateSubscriptionQuery, [
      paymentMethod,
      subscription.subscription_id
    ]);
    
    await client.query('COMMIT');
    
    return {
      subscription: updatedSubscriptionResult.rows[0],
      invoice: invoiceResult.rows[0],
      isExistingRenewal: false
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  // Subscription Plans
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  
  // Customer Subscriptions  
  getAllCustomerSubscriptions,
  getCustomerSubscriptionById,
  createCustomerSubscription,
  activateSubscription,
  getSubscriptionByUserId,
  updateSubscriptionPaymentStatus,
  getActiveSubscriptionByUserId,
  expireOverdueSubscriptions,
  reactivateSubscription,
  cancelSubscriptionByUserId,
  
  // Invoices
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  addLateFees,
  
  // Payments
  getPaymentsByInvoiceId,
  createPayment,
  
  // Billing History
  getBillingHistory,
  
  // Auto-generation
  generateMonthlyInvoices,
  
  // Payment Source Tracking
  createPaymentSource,
  updatePaymentStatus,
  getPaymentStatus,
  getPaymentSourceById,
  
  // Cash Payment Management
  getPendingCashSubscriptions,
  
  // Subscription Renewal
  renewActiveSubscription
};