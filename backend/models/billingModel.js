const { pool } = require('../config/db');

// Subscription Plans
const getAllSubscriptionPlans = async () => {
  const query = 'SELECT * FROM subscription_plans WHERE status = $1 ORDER BY plan_name';
  const result = await pool.query(query, ['active']);
  return result.rows;
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
  
  // Determine initial status based on payment method
  const initialStatus = payment_method.toLowerCase() === 'gcash' ? 'pending_payment' : 'pending_payment';
  const paymentStatus = 'pending';
  
  const query = `
    INSERT INTO customer_subscriptions (
      user_id, plan_id, billing_start_date, payment_method, 
      status, payment_status, subscription_created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, plan_id, billing_start_date, payment_method, initialStatus, paymentStatus]);
  return result.rows[0];
};

// Invoices
const getAllInvoices = async (filters = {}) => {
  // Fetch all invoices and join users for username
  const query = `
    SELECT i.*, u.username
    FROM invoices i
    LEFT JOIN users u ON i.user_id = u.user_id
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
      p.payment_id as transaction_id,
      i.invoice_number as invoice_id,
      u.username as subscriber,
      sp.plan_name as plan,
      p.amount,
      p.payment_date,
      p.payment_method,
      'Completed' as status,
      p.notes,
      p.reference_number,
      cu.username as collector_name,
      u.contact_number as phone
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.invoice_id
    JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
    JOIN users u ON cs.user_id = u.user_id
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    LEFT JOIN collectors c ON p.collector_id = c.collector_id
    LEFT JOIN users cu ON c.user_id = cu.user_id
  `;

  const whereConditions = [];
  const queryParams = [];
  let paramCount = 0;

  if (filters.dateFrom) {
    paramCount++;
    whereConditions.push(`p.payment_date >= $${paramCount}`);
    queryParams.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    paramCount++;
    whereConditions.push(`p.payment_date <= $${paramCount}`);
    queryParams.push(filters.dateTo);
  }

  if (filters.plan && filters.plan !== 'All Plans') {
    paramCount++;
    whereConditions.push(`sp.plan_name = $${paramCount}`);
    queryParams.push(filters.plan);
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'All Methods') {
    paramCount++;
    whereConditions.push(`p.payment_method = $${paramCount}`);
    queryParams.push(filters.paymentMethod);
  }

  if (filters.collector && filters.collector !== 'All Collectors') {
    paramCount++;
    whereConditions.push(`cu.username = $${paramCount}`);
    queryParams.push(filters.collector);
  }

  if (whereConditions.length > 0) {
    query += ' WHERE ' + whereConditions.join(' AND ');
  }

  query += ' ORDER BY p.payment_date DESC';

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

// Subscription Status Management
const activateSubscription = async (subscriptionId, paymentData = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update subscription status to active
    const updateSubscriptionQuery = `
      UPDATE customer_subscriptions 
      SET status = 'active', 
          payment_status = 'paid',
          payment_confirmed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = $1
      RETURNING *
    `;
    const subscriptionResult = await client.query(updateSubscriptionQuery, [subscriptionId]);
    
    if (subscriptionResult.rows.length === 0) {
      throw new Error('Subscription not found');
    }
    
    const subscription = subscriptionResult.rows[0];
    
    // Resolve a single target invoice to mark as paid: pick the latest
    // unpaid/partially_paid/overdue invoice for this subscription.
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
    if (paymentData) {
      const { amount, payment_method, reference_number, notes } = paymentData;
      // If we resolved a specific invoice above, use it; otherwise, fall back to the
      // most recent invoice for the subscription (to preserve legacy behavior).
      if (targetInvoiceId) {
        const createPaymentQuery = `
          INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
          RETURNING *
        `;
        await client.query(createPaymentQuery, [targetInvoiceId, amount, payment_method, reference_number, notes]);
      } else {
        const fallbackInvoiceQuery = `
          SELECT invoice_id FROM invoices 
          WHERE subscription_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `;
        const fb = await client.query(fallbackInvoiceQuery, [subscriptionId]);
        const fbInvoiceId = fb.rows[0]?.invoice_id;
        if (fbInvoiceId) {
          const createPaymentQuery = `
            INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
            RETURNING *
          `;
          await client.query(createPaymentQuery, [fbInvoiceId, amount, payment_method, reference_number, notes]);
        }
      }
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
  getPendingCashSubscriptions
};