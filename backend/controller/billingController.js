const billingModel = require('../models/billingModel');

// Subscription Plans Controllers
const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await billingModel.getAllSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch subscription plans', details: error.message });
  }
};

const getSubscriptionPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await billingModel.getSubscriptionPlanById(planId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch subscription plan', details: error.message });
  }
};

const createSubscriptionPlan = async (req, res) => {
  try {
    const planData = req.body;
    const newPlan = await billingModel.createSubscriptionPlan(planData);
    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to create subscription plan', details: error.message });
  }
};

// Customer Subscriptions Controllers
const getAllCustomerSubscriptions = async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Fetching all customer subscriptions...');
    const subscriptions = await billingModel.getAllCustomerSubscriptions();
    console.log('✅ [DEBUG] Subscriptions fetched:', subscriptions);
    res.json(subscriptions);
  } catch (error) {
    console.error('❌ [DEBUG] Error fetching customer subscriptions:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch customer subscriptions', details: error.message });
  }
};

const getCustomerSubscriptionById = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await billingModel.getCustomerSubscriptionById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Customer subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching customer subscription:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch customer subscription', details: error.message });
  }
};

const createCustomerSubscription = async (req, res) => {
  try {
    const subscriptionData = req.body;
    const newSubscription = await billingModel.createCustomerSubscription(subscriptionData);
    res.status(201).json(newSubscription);
  } catch (error) {
    console.error('Error creating customer subscription:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to create customer subscription', details: error.message });
  }
};

// Invoices Controllers
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await billingModel.getAllInvoices();
    const transformedInvoices = invoices.map(invoice => ({
      id: invoice.invoice_id,
      subscriber: invoice.username, // Use username from users table
      plan: invoice.invoice_type, // Or use plan_name if available
      amount: invoice.amount,
      dueDate: invoice.due_date,
      status: invoice.status,
      lateFee: invoice.late_fees,
      generatedDate: invoice.generated_date,
      serviceStart: invoice.service_start,
      serviceEnd: invoice.service_end,
      notes: invoice.notes,
      isVoided: invoice.is_voided,
      metadata: invoice.metadata,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    }));
    res.json(transformedInvoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await billingModel.getInvoiceById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get payment history for this invoice
    const payments = await billingModel.getPaymentsByInvoiceId(invoiceId);
    const paymentHistory = payments.map(payment => ({
      date: payment.payment_date,
      amount: `₱${parseFloat(payment.amount).toLocaleString()}`,
      method: payment.payment_method,
      reference: payment.reference_number
    }));
    
    const transformedInvoice = {
      id: invoice.invoice_number,
      customerId: invoice.user_id,
      subscriber: invoice.username,
      plan: invoice.plan_name,
      amount: `₱${parseFloat(invoice.amount).toLocaleString()}`,
      dueDate: invoice.due_date,
      status: invoice.status,
      generatedDate: invoice.generated_date,
      lateFee: invoice.late_fees > 0 ? `₱${parseFloat(invoice.late_fees).toLocaleString()}` : null,
      paymentHistory
    };
    
    res.json(transformedInvoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const newInvoice = await billingModel.createInvoice(invoiceData);
    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
};

const updateInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status } = req.body;
    
    const updatedInvoice = await billingModel.updateInvoiceStatus(invoiceId, status);
    
    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to update invoice status', details: error.message });
  }
};

const addLateFees = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { lateFees } = req.body;
    
    const updatedInvoice = await billingModel.addLateFees(invoiceId, lateFees);
    
    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error adding late fees:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to add late fees', details: error.message });
  }
};

// Payments Controllers
const getPaymentsByInvoiceId = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const payments = await billingModel.getPaymentsByInvoiceId(invoiceId);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
  }
};

const createPayment = async (req, res) => {
  try {
    const paymentData = req.body;
    const newPayment = await billingModel.createPayment(paymentData);
    res.status(201).json(newPayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to create payment', details: error.message });
  }
};

// Billing History Controllers
const getBillingHistory = async (req, res) => {
  try {
    const filters = req.query;
    const history = await billingModel.getBillingHistory(filters);
    
    // Transform data to match frontend expectations
    const transformedHistory = history.map(transaction => ({
      id: `TRX-${transaction.transaction_id.toString().padStart(3, '0')}`,
      invoiceId: transaction.invoice_id,
      subscriber: transaction.subscriber,
      plan: transaction.plan,
      amount: `₱${parseFloat(transaction.amount).toLocaleString()}`,
      paymentDate: transaction.payment_date,
      paymentMethod: transaction.payment_method,
      status: transaction.status,
      notes: transaction.notes,
      details: {
        address: transaction.address,
        email: transaction.email,
        phone: transaction.phone,
        collectionSchedule: 'Every Monday', // This would need to come from collection schedules
        transactionTime: '14:30', // This would need to be stored in payments table
        referenceNumber: transaction.reference_number,
        collectorName: transaction.collector_name || 'N/A'
      }
    }));
    
    res.json(transformedHistory);
  } catch (error) {
    console.error('Error fetching billing history:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch billing history', details: error.message });
  }
};

// Auto-generation Controllers
const generateMonthlyInvoices = async (req, res) => {
  try {
    const newInvoices = await billingModel.generateMonthlyInvoices();
    res.json({ 
      message: `Generated ${newInvoices.length} new invoices`,
      invoices: newInvoices 
    });
  } catch (error) {
    console.error('Error generating monthly invoices:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to generate monthly invoices', details: error.message });
  }
};

// Dashboard Statistics
const getBillingStats = async (req, res) => {
  try {
    // This would need to be implemented in the model
    // For now, returning basic structure
    const stats = {
      totalInvoices: 0,
      unpaidInvoices: 0,
      totalRevenue: 0,
      monthlyRevenue: 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to fetch billing statistics', details: error.message });
  }
};

// Mobile Subscription Creation with Invoice Generation
const createMobileSubscription = async (req, res) => {
  try {
    const { user_id, plan_id, payment_method } = req.body;
    
    // Validate required fields
    if (!user_id || !plan_id || !payment_method) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'user_id, plan_id, and payment_method are required' 
      });
    }

    // Get plan details
    const plan = await billingModel.getSubscriptionPlanById(plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Set billing start date to current date
    const billing_start_date = new Date().toISOString().split('T')[0];

    // Create subscription
    const subscriptionData = {
      user_id,
      plan_id,
      billing_start_date,
      payment_method
    };

    const newSubscription = await billingModel.createCustomerSubscription(subscriptionData);

    // Generate invoice for the subscription
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 30); // Due in 30 days

    const invoiceData = {
      subscription_id: newSubscription.subscription_id,
      amount: plan.price,
      due_date: due_date.toISOString().split('T')[0],
      generated_date: new Date().toISOString().split('T')[0],
      notes: `Initial invoice for ${plan.plan_name} subscription`
    };

    const newInvoice = await billingModel.createInvoice(invoiceData);

    // If payment method is GCash, create immediate payment record
    let paymentRecord = null;
    if (payment_method.toLowerCase() === 'gcash') {
      const paymentData = {
        invoice_id: newInvoice.invoice_id,
        amount: plan.price,
        payment_method: 'GCash',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: `GCASH-${Date.now()}`,
        notes: `GCash payment for ${plan.plan_name} subscription`
      };
      
      paymentRecord = await billingModel.createPayment(paymentData);
    }

    // Return comprehensive response
    const response = {
      success: true,
      message: 'Subscription created successfully',
      subscription: {
        id: newSubscription.subscription_id,
        plan_name: plan.plan_name,
        price: plan.price,
        billing_start_date: newSubscription.billing_start_date,
        payment_method: newSubscription.payment_method,
        status: 'active'
      },
      invoice: {
        id: newInvoice.invoice_number,
        amount: newInvoice.amount,
        due_date: newInvoice.due_date,
        status: payment_method.toLowerCase() === 'gcash' ? 'paid' : 'unpaid'
      },
      payment: paymentRecord ? {
        id: paymentRecord.payment_id,
        amount: paymentRecord.amount,
        method: paymentRecord.payment_method,
        reference: paymentRecord.reference_number,
        date: paymentRecord.payment_date
      } : null
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating mobile subscription:', error);
    console.error('Stack:', error.stack);
    console.error('Request info:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
};

// Payment Status Methods for GCash Integration
const updatePaymentStatus = async (sourceId, status) => {
  try {
    return await billingModel.updatePaymentStatus(sourceId, status);
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

const getPaymentStatus = async (sourceId) => {
  try {
    return await billingModel.getPaymentStatus(sourceId);
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
};

// GCash Payment Source Creation
const createGcashSource = async (req, res) => {
  try {
    console.log('📥 Creating GCash payment source:', req.body);
    
    const { amount, description, isAdmin } = req.body;
    
    // Validate required fields
    if (!amount || !description) {
      return res.status(400).json({
        error: 'Missing required fields: amount and description'
      });
    }

    // Get PayMongo credentials from environment
    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!paymongoSecretKey) {
      return res.status(500).json({
        error: 'PayMongo configuration not found'
      });
    }

    // Determine redirect URLs based on isAdmin flag
    const successUrl = isAdmin 
      ? process.env.ADMIN_SUCCESS_URL 
      : process.env.FRONTEND_SUCCESS_URL;
    const failedUrl = isAdmin 
      ? process.env.ADMIN_FAILED_URL 
      : process.env.FRONTEND_FAILED_URL;

    // Create PayMongo GCash Source
    const paymongoData = {
      data: {
        attributes: {
          amount: parseInt(amount), // Amount in centavos
          redirect: {
            success: successUrl,
            failed: failedUrl
          },
          type: 'gcash',
          currency: 'PHP',
          description: description
        }
      }
    };

    console.log('🔄 Creating PayMongo source with data:', JSON.stringify(paymongoData, null, 2));

    // Make request to PayMongo API
    const response = await fetch('https://api.paymongo.com/v1/sources', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(paymongoSecretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymongoData)
    });

    const paymongoResult = await response.json();
    console.log('🔥 PayMongo response:', JSON.stringify(paymongoResult, null, 2));

    if (!response.ok) {
      console.error('❌ PayMongo API error:', paymongoResult);
      return res.status(400).json({
        error: 'PayMongo API error',
        details: paymongoResult.errors || paymongoResult
      });
    }

    const source = paymongoResult.data;
    
    // Store payment source in database for tracking
    try {
      const paymentData = {
        source_id: source.id,
        amount: amount / 100, // Convert from centavos to pesos for storage
        description: description,
        status: 'pending',
        payment_method: 'GCash',
        created_at: new Date().toISOString()
      };
      
      await billingModel.createPaymentSource(paymentData);
      console.log('✅ Payment source stored in database:', source.id);
    } catch (dbError) {
      console.error('⚠️ Database error while creating payment source:', dbError);
      // Continue anyway, as the main functionality should work
    }
    
    console.log('✅ GCash payment source created successfully:', source.id);
    
    res.json({
      success: true,
      source_id: source.id,
      checkout_url: source.attributes.redirect.checkout_url,
      amount: source.attributes.amount,
      description: source.attributes.description,
      status: source.attributes.status
    });
    
  } catch (error) {
    console.error('❌ Error creating GCash payment source:', error);
    res.status(500).json({
      error: 'Failed to create GCash payment source',
      details: error.message
    });
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
  createMobileSubscription,
  
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
  
  // Dashboard
  getBillingStats,
  
  // Payment Status
  updatePaymentStatus,
  getPaymentStatus,
  
  // GCash Integration
  createGcashSource
}; 