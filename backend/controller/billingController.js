const billingModel = require('../models/billingModel');
const config = require('../config/config');
const { pool } = require('../config/db');

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
      plan: invoice.plan_name || invoice.invoice_type, // prefer plan_name if joined
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

// Mobile Subscription Creation with Single Plan (₱199)
const createMobileSubscription = async (req, res) => {
  try {
    console.log('📥 Mobile subscription request body:', req.body);
    console.log('📥 Request body keys:', Object.keys(req.body || {}));
    
    const { payment_method } = req.body;
    
    // Extract user_id from JWT token (user is already authenticated)
    const user_id = req.user?.userId || req.user?.user_id;
    
    console.log('🔍 Extracted user_id from token:', user_id);
    
    // Validate required fields (plan_id no longer needed - single plan system)
    if (!user_id || !payment_method) {
      console.log('❌ Missing fields - user_id:', user_id, 'payment_method:', payment_method);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'user_id (from token) and payment_method are required',
        received: { user_id, payment_method }
      });
    }

    // Check if user already has an active subscription (not expired/cancelled)
    const activeSubscription = await billingModel.getActiveSubscriptionByUserId(user_id);
    let subscription = null;
    
    if (activeSubscription) {
      console.log('⚠️ User already has active subscription, creating new billing cycle');
      // Use existing active subscription for renewal/new billing cycle
      subscription = activeSubscription;
    } else {
      // Check if user has any previous subscription (for reactivation)
      const existingSubscription = await billingModel.getSubscriptionByUserId(user_id);
      
      if (existingSubscription && (existingSubscription.status === 'suspended' || existingSubscription.status === 'cancelled')) {
        console.log('🔄 Checking reactivation type for previous subscription');
        
        // Import enhanced reactivation module
        const { enhancedReactivation, shouldUseEnhancedReactivation } = require('../models/enhancedReactivation');
        
        // Determine if enhanced reactivation is needed
        const needsEnhanced = await shouldUseEnhancedReactivation(user_id);
        
        if (needsEnhanced) {
          console.log('🔄 Using enhanced reactivation (long-term cancellation)');
          const reactivationResult = await enhancedReactivation(user_id, {
            amount: 199,
            payment_method: payment_method,
            reference_number: `ENHANCED-REACTIVATION-${Date.now()}`,
            notes: 'Enhanced subscription reactivation'
          });
          
          subscription = reactivationResult.subscription;
          
          // Add reactivation metadata to response
          subscription.reactivation_type = reactivationResult.reactivationType;
          subscription.days_since_cancellation = reactivationResult.daysSinceCancellation;
          subscription.archived_old_invoices = reactivationResult.archivedInvoices;
          
        } else {
          console.log('🔄 Using standard reactivation');
          // Standard reactivation for recent cancellations
          subscription = await billingModel.reactivateSubscription(user_id, {
            amount: 199,
            payment_method: payment_method,
            reference_number: `REACTIVATION-${Date.now()}`,
            notes: 'Standard subscription reactivation'
          });
        }
      } else {
      // Get the single ₱199 plan (Full Plan)
      const plans = await billingModel.getAllSubscriptionPlans();
      const plan = plans.find(p => p.price == 199);
      if (!plan) {
        return res.status(404).json({ error: 'Full Plan (₱199) not found in database' });
      }

      // Set billing start date to current date
      const billing_start_date = new Date().toISOString().split('T')[0];

      // Create new subscription with pending_payment status
      const subscriptionData = {
        user_id,
        plan_id: plan.plan_id,
        billing_start_date,
        payment_method,
        user_id: user_id // Add user_id to subscriptionData
      };

        subscription = await billingModel.createCustomerSubscription(subscriptionData);
      }
    }

    // Get plan details for invoice generation
    const plan = await billingModel.getSubscriptionPlanById(subscription.plan_id);
    console.log('✅ Subscription processed successfully:', {
      subscription_id: subscription.subscription_id,
      user_id: user_id,
      plan: plan.plan_name,
      amount: `₱${plan.price}`,
      status: subscription.status,
      payment_status: subscription.payment_status
    });

    // Check for recent unpaid invoice to avoid duplicates during testing
    const recentInvoiceQuery = `
      SELECT * FROM invoices 
      WHERE user_id = $1 AND status = 'unpaid' 
      AND DATE(created_at) = CURRENT_DATE
      ORDER BY created_at DESC LIMIT 1
    `;
    const recentInvoiceResult = await pool.query(recentInvoiceQuery, [user_id]);
    
    let newInvoice;
    if (recentInvoiceResult.rows.length > 0) {
      console.log('📋 Using existing unpaid invoice from today');
      newInvoice = recentInvoiceResult.rows[0];
    } else {
      // Generate invoice for the subscription
      const due_date = new Date();
      due_date.setDate(due_date.getDate() + 30); // Due in 30 days

      const invoiceData = {
        user_id: user_id,
        plan_id: plan.plan_id,
        subscription_id: subscription.subscription_id,
        due_date: due_date.toISOString().split('T')[0],
        generated_date: new Date().toISOString().split('T')[0],
        notes: subscription.reactivated_at ? 
          `Reactivation invoice for ${plan.plan_name} subscription` :
          `Initial invoice for ${plan.plan_name} subscription`
      };

      console.log('🔄 GENERATING NEW INVOICE...');
      console.log('📋 Invoice Data:', {
        user_id: user_id,
        plan: plan.plan_name,
        amount: `₱${plan.price}`,
        due_date: invoiceData.due_date,
        type: subscription.reactivated_at ? 'reactivation' : 'initial'
      });

      newInvoice = await billingModel.createInvoice(invoiceData);
      
      console.log('✨ NEW INVOICE CREATED! ✅');
      console.log('🎯 Invoice Number:', newInvoice.invoice_number);
    }
    
    console.log('🧾 INVOICE GENERATION COMPLETE! ✅');
    console.log('📄 Final Invoice Details:', {
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
      subscription_id: subscription.subscription_id,
      user_id: user_id,
      amount: `₱${newInvoice.amount || plan.price}`,
      due_date: newInvoice.due_date || 'N/A',
      status: newInvoice.status || 'unpaid',
      plan: plan.plan_name,
      subscription_status: subscription.status,
      payment_status: subscription.payment_status,
      created_at: new Date().toISOString()
    });

    // Determine subscription success indication based on payment method
    let subscriptionStatus = subscription.status || 'pending_payment';
    let paymentStatus = subscription.payment_status || 'pending';
    let nextStep = '';
    
    if (payment_method.toLowerCase() === 'gcash') {
      nextStep = 'complete_gcash_payment';
      paymentStatus = paymentStatus === 'paid' ? 'paid' : 'awaiting_gcash';
    } else if (payment_method.toLowerCase() === 'cash') {
      nextStep = 'await_collection_payment';
      paymentStatus = paymentStatus === 'paid' ? 'paid' : 'awaiting_cash';
    }

    // Return comprehensive response with clear next steps
    const response = {
      success: true,
      message: subscription.reactivated_at ? 
        'Subscription reactivated successfully' :
        activeSubscription ? 
          'New billing cycle created for existing subscription' : 
          'Subscription created successfully',
      subscription: {
        id: subscription.subscription_id,
        plan_name: plan.plan_name,
        price: plan.price,
        billing_start_date: subscription.billing_start_date,
        payment_method: subscription.payment_method,
        status: subscriptionStatus,
        payment_status: paymentStatus,
        next_billing_date: subscription.next_billing_date,
        billing_cycle_count: subscription.billing_cycle_count || 0,
        reactivated: !!subscription.reactivated_at
      },
      invoice: {
        id: newInvoice.invoice_number,
        invoice_id: newInvoice.invoice_id,
        due_date: newInvoice.due_date,
        status: 'unpaid'
      },
      next_step: nextStep,
      instructions: payment_method.toLowerCase() === 'gcash' 
        ? 'Complete payment via GCash to activate your subscription'
        : 'Your subscription will be activated when you pay the collector during waste collection'
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
const updatePaymentStatus = async (sourceId, status, webhookData = null) => {
  try {
    return await billingModel.updatePaymentStatus(sourceId, status, webhookData);
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

// GCash Payment Source Creation with Subscription Linking
const createGcashSource = async (req, res) => {
  try {
    console.log('📥 Creating GCash payment source:', req.body);
    
    const { amount, description, isAdmin, subscription_id, invoice_id } = req.body;
    
    // Validate required fields
    if (!amount || !description) {
      return res.status(400).json({
        error: 'Missing required fields: amount and description'
      });
    }

    // Get PayMongo credentials from environment
    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!paymongoSecretKey) {
      console.error('❌ PayMongo Secret Key not found in environment variables');
      console.log('💡 Please set PAYMONGO_SECRET_KEY in your .env file');
      return res.status(500).json({
        error: 'PayMongo configuration not found. Please check your environment variables.',
        hint: 'Set PAYMONGO_SECRET_KEY in your .env file'
      });
    }

    // Determine redirect URLs based on isAdmin flag using centralized config
    const baseSuccessUrl = isAdmin 
      ? process.env.ADMIN_SUCCESS_URL || config.ADMIN_PAYMENT_REDIRECT.SUCCESS
      : process.env.FRONTEND_SUCCESS_URL || config.PAYMENT_REDIRECT.SUCCESS;
    const baseFailedUrl = isAdmin 
      ? process.env.ADMIN_FAILED_URL || config.ADMIN_PAYMENT_REDIRECT.FAILED
      : process.env.FRONTEND_FAILED_URL || config.PAYMENT_REDIRECT.FAILED;
    
    // Create PayMongo GCash Source first to get the source ID
    const paymongoData = {
      data: {
        attributes: {
          amount: parseInt(amount), // Amount in centavos
          redirect: {
            // Important: include subscription_id (if available) so the success redirect carries it,
            // allowing server to resolve source_id via DB if PayMongo doesn't append it.
            success: subscription_id ? `${baseSuccessUrl}?subscription_id=${subscription_id}` : baseSuccessUrl,
            failed: subscription_id ? `${baseFailedUrl}?subscription_id=${subscription_id}` : baseFailedUrl
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
    
    // Now create proper redirect URLs with source ID
    const successUrl = subscription_id 
      ? `${baseSuccessUrl}?source_id=${source.id}&subscription_id=${subscription_id}` 
      : `${baseSuccessUrl}?source_id=${source.id}`;
    const failedUrl = subscription_id 
      ? `${baseFailedUrl}?source_id=${source.id}&subscription_id=${subscription_id}` 
      : `${baseFailedUrl}?source_id=${source.id}`;
    
    // Resolve invoice_id if not provided using subscription_id (latest unpaid invoice)
    let resolvedInvoiceId = invoice_id;
    try {
      if (!resolvedInvoiceId && subscription_id) {
        const invRes = await pool.query(
          `SELECT invoice_id FROM invoices 
           WHERE subscription_id = $1 AND status = 'unpaid' 
           ORDER BY created_at DESC LIMIT 1`,
          [subscription_id]
        );
        if (invRes.rows.length > 0) {
          resolvedInvoiceId = invRes.rows[0].invoice_id;
          console.log('🔗 Resolved invoice_id from subscription_id:', resolvedInvoiceId);
        } else {
          console.warn('⚠️ No unpaid invoice found for subscription_id:', subscription_id);
        }
      }
    } catch (e) {
      console.error('⚠️ Error resolving invoice_id from subscription_id:', e.message);
    }

    // Store payment source in database for tracking
    try {
      const paymentData = {
        source_id: source.id,
        invoice_id: resolvedInvoiceId, // Link to specific invoice
        amount: parseInt(amount),
        currency: 'PHP',
        payment_method: 'gcash',
        checkout_url: source.attributes?.redirect?.checkout_url,
        redirect_success: successUrl,
        redirect_failed: failedUrl
      };

      await billingModel.createPaymentSource(paymentData);
      console.log('✅ Payment source stored in database:', source.id);
      if (!resolvedInvoiceId) {
        console.warn('⚠️ Payment source saved WITHOUT invoice_id. Downstream updates (invoice/subscription activation) will not occur until linked.');
      }
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
      status: source.attributes.status,
      subscription_id: subscription_id
    });
    
  } catch (error) {
    console.error('❌ Error creating GCash payment source:', error);
    res.status(500).json({
      error: 'Failed to create GCash payment source',
      details: error.message
    });
  }
};

// Payment Success Confirmation for GCash
const confirmGcashPayment = async (req, res) => {
  try {
    const { source_id, subscription_id } = req.body;
    
    if (!source_id || !subscription_id) {
      return res.status(400).json({
        error: 'Missing required fields: source_id and subscription_id'
      });
    }

    // Get payment source details
    const paymentSource = await billingModel.getPaymentSourceById(source_id);
    if (!paymentSource) {
      return res.status(404).json({ error: 'Payment source not found' });
    }

    // Activate subscription with payment data
    const paymentData = {
      amount: paymentSource.amount / 100, // Convert from centavos
      payment_method: 'GCash',
      reference_number: source_id,
      notes: 'GCash payment confirmation'
    };

    const activatedSubscription = await billingModel.activateSubscription(subscription_id, paymentData);
    
    // Update payment source status
    await billingModel.updatePaymentStatus(source_id, 'completed');

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: activatedSubscription
    });
    
  } catch (error) {
    console.error('Error confirming GCash payment:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      details: error.message
    });
  }
};

// Cash Payment Confirmation (for collectors)
const confirmCashPayment = async (req, res) => {
  try {
    const { subscription_id, collector_id, amount, notes } = req.body;
    
    if (!subscription_id || !collector_id || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: subscription_id, collector_id, and amount'
      });
    }

    // Activate subscription with cash payment data
    const paymentData = {
      amount: parseFloat(amount),
      payment_method: 'Cash',
      reference_number: `CASH-${Date.now()}`,
      notes: notes || 'Cash payment on collection'
    };

    const activatedSubscription = await billingModel.activateSubscription(subscription_id, paymentData);

    res.json({
      success: true,
      message: 'Cash payment confirmed and subscription activated',
      subscription: activatedSubscription
    });
    
  } catch (error) {
    console.error('Error confirming cash payment:', error);
    res.status(500).json({
      error: 'Failed to confirm cash payment',
      details: error.message
    });
  }
};

// Get User Subscription Status
const getUserSubscriptionStatus = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const subscription = await billingModel.getSubscriptionByUserId(user_id);
    
    if (!subscription) {
      return res.json({
        has_subscription: false,
        message: 'No subscription found for this user'
      });
    }

    res.json({
      has_subscription: true,
      subscription: {
        id: subscription.subscription_id,
        plan_name: subscription.plan_name,
        price: subscription.price,
        status: subscription.status,
        payment_status: subscription.payment_status,
        payment_method: subscription.payment_method,
        billing_start_date: subscription.billing_start_date,
        created_at: subscription.subscription_created_at,
        payment_confirmed_at: subscription.payment_confirmed_at
      }
    });
    
  } catch (error) {
    console.error('Error fetching user subscription status:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription status',
      details: error.message
    });
  }
};

// Get Pending Cash Subscriptions for Collectors
const getPendingCashSubscriptions = async () => {
  try {
    return await billingModel.getPendingCashSubscriptions();
  } catch (error) {
    console.error('Error fetching pending cash subscriptions:', error);
    throw error;
  }
};

// Cancel subscription (manual user-initiated)
const cancelSubscription = async (req, res) => {
  try {
    // Default to the authenticated user's id
    const authUserId = req.user?.userId || req.user?.user_id;
    const { user_id, reason } = req.body || {};

    // Allow admin to specify a user_id, otherwise use auth user
    const targetUserId = user_id || authUserId;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Missing user context' });
    }

    const updated = await billingModel.cancelSubscriptionByUserId(targetUserId, reason || 'User requested cancellation');
    return res.json({ success: true, subscription: updated });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription', details: error.message });
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
  getUserSubscriptionStatus,
  getPendingCashSubscriptions,
  
  // Invoices
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  addLateFees,
  
  // Payments
  getPaymentsByInvoiceId,
  createPayment,
  confirmGcashPayment,
  confirmCashPayment,
  
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
  createGcashSource,

  // Manual cancellation
  cancelSubscription
}; 