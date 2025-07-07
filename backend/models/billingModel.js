const pool = require('../config/db');

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
  const query = `
    INSERT INTO customer_subscriptions (user_id, plan_id, billing_start_date, payment_method)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, plan_id, billing_start_date, payment_method]);
  return result.rows[0];
};

// Invoices
const getAllInvoices = async (filters = {}) => {
  // Fetch all invoices and join users for username
  const query = `
    SELECT i.*, u.username
    FROM invoices i
    LEFT JOIN users u ON i.resident_id = u.user_id
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getInvoiceById = async (invoiceId) => {
  const query = `
    SELECT 
      i.*,
      cs.subscription_id,
      u.user_id,
      u.username,
      u.contact_number,
      sp.plan_name,
      sp.price,
      sp.frequency
    FROM invoices i
    JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
    JOIN users u ON cs.user_id = u.user_id
    JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
    WHERE i.invoice_id = $1
  `;
  const result = await pool.query(query, [invoiceId]);
  return result.rows[0];
};

const createInvoice = async (invoiceData) => {
  const { subscription_id, amount, due_date, generated_date, notes } = invoiceData;
  
  // Generate invoice number
  const invoiceNumberQuery = 'SELECT COUNT(*) + 1 as next_number FROM invoices';
  const invoiceNumberResult = await pool.query(invoiceNumberQuery);
  const invoiceNumber = `INV-${String(invoiceNumberResult.rows[0].next_number).padStart(3, '0')}`;

  const query = `
    INSERT INTO invoices (invoice_number, subscription_id, amount, due_date, generated_date, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await pool.query(query, [invoiceNumber, subscription_id, amount, due_date, generated_date, notes]);
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

module.exports = {
  // Subscription Plans
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  
  // Customer Subscriptions
  getAllCustomerSubscriptions,
  getCustomerSubscriptionById,
  createCustomerSubscription,
  
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
  generateMonthlyInvoices
}; 