const billingModel = require('../models/billingModel');
const config = require('../config/config');
const express = require('express');
const { pool } = require('../config/db');
const QRCode = require('qrcode');
const { 
  validatePaymentConfiguration, 
  validateDeepLinkGeneration, 
  validatePaymentOptions, 
  logPaymentError 
} = require('../utils/paymentValidation');
const {
  notifySubscriptionActivated,
  notifyPaymentConfirmed,
  notifyInvoiceGenerated,
  notifyLateFeeAdded,
  notifyMonthlyInvoicesGenerated
} = require('../services/subscriptionNotificationService');

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
    
    // Send late fee notification
    try {
      await notifyLateFeeAdded(updatedInvoice.user_id, {
        invoice_number: updatedInvoice.invoice_number,
        late_fee: lateFees,
        new_total: parseFloat(updatedInvoice.amount) + parseFloat(lateFees)
      });
    } catch (notifError) {
      console.error('⚠️ Failed to send late fee notification:', notifError);
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
      checkout_url: transaction.checkout_url,
      source_id: transaction.source_id,
      instructions: [
        "1. Scan the QR code with any QR scanner",
        "2. You'll be redirected to PayMongo checkout",
        "3. Select GCash as payment method", 
        "4. Complete payment in GCash app",
        "5. Payment will be automatically verified"
      ],
      expires_in: "30 minutes",
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
    
    // Calculate total amount and send admin notification
    const totalAmount = newInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount || 0), 0);
    
    try {
      await notifyMonthlyInvoicesGenerated(newInvoices.length, totalAmount.toFixed(2));
    } catch (notifError) {
      console.error('⚠️ Failed to send monthly invoice notification:', notifError);
    }
    
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

    // Check if user already has any subscription (active, suspended, or cancelled)
    const existingSubscription = await billingModel.getSubscriptionByUserId(user_id);
    let subscription = null;
    
    if (existingSubscription && existingSubscription.status === 'active') {
      console.log('⚠️ User already has active subscription, creating new billing cycle');
      // Use existing active subscription for renewal/new billing cycle
      subscription = existingSubscription;
    } else if (existingSubscription && (existingSubscription.status === 'pending_payment' || existingSubscription.status === 'suspended' || existingSubscription.status === 'cancelled')) {
      if (existingSubscription.status === 'pending_payment') {
        console.log('🔄 User has pending payment subscription, reusing it');
        subscription = existingSubscription;
      } else {
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
      
      // Send invoice generation notification
      try {
        await notifyInvoiceGenerated(user_id, {
          invoice_number: newInvoice.invoice_number,
          amount: newInvoice.amount || plan.price,
          due_date: invoiceData.due_date
        });
      } catch (notifError) {
        console.error('⚠️ Failed to send invoice notification:', notifError);
      }
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
        existingSubscription && existingSubscription.status === 'active' ? 
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
    
    // DEMO MODE: Check if we should simulate GCash payment for defense
    const isDemoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo';
    
    if (isDemoMode) {
      console.log('🎭 DEMO MODE: Simulating GCash payment for defense presentation');
      
      // Create a simulated successful payment
      const simulatedSourceId = `src_demo_${Date.now()}`;
      const simulatedCheckoutUrl = `${process.env.PUBLIC_URL || 'https://waste-scheduling-and-billing-system-for.onrender.com'}/demo-gcash-payment?source_id=${simulatedSourceId}&subscription_id=${subscription_id}`;
      
      // Store payment source for tracking
      try {
        await pool.query(`
          INSERT INTO payment_sources (source_id, subscription_id, invoice_id, amount, status, created_at)
          VALUES ($1, $2, $3, $4, 'pending', NOW())
          ON CONFLICT (source_id) DO NOTHING
        `, [simulatedSourceId, subscription_id, invoice_id, amount]);
      } catch (dbError) {
        console.log('Note: payment_sources table may not exist, continuing with demo...');
      }
      
      return res.json({
        source_id: simulatedSourceId,
        checkout_url: simulatedCheckoutUrl,
        status: 'pending',
        demo_mode: true,
        message: 'Demo payment created - will auto-complete in 5 seconds'
      });
    }
    
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

    // Determine redirect URLs based on isAdmin flag and client type
    // For mobile app, use deep links; for web, use regular URLs
    const isMobileRequest = req.headers['user-agent']?.includes('Expo') || 
                           req.headers['x-client-type'] === 'mobile' ||
                           req.body.client_type === 'mobile';
    
    let baseSuccessUrl, baseFailedUrl;
    
    if (isMobileRequest && !isAdmin) {
      // Mobile app - use HTTP URLs that can redirect to deep links
      baseSuccessUrl = `${process.env.PUBLIC_URL || config.PUBLIC_URL}/api/billing/mobile-payment-success`;
      baseFailedUrl = `${process.env.PUBLIC_URL || config.PUBLIC_URL}/api/billing/mobile-payment-failed`;
    } else {
      // Web/Admin URLs
      baseSuccessUrl = isAdmin 
        ? process.env.ADMIN_SUCCESS_URL || config.ADMIN_PAYMENT_REDIRECT.SUCCESS
        : process.env.FRONTEND_SUCCESS_URL || config.PAYMENT_REDIRECT.SUCCESS;
      baseFailedUrl = isAdmin 
        ? process.env.ADMIN_FAILED_URL || config.ADMIN_PAYMENT_REDIRECT.FAILED
        : process.env.FRONTEND_FAILED_URL || config.PAYMENT_REDIRECT.FAILED;
    }
    
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
      
      // Check for specific GCash configuration error
      const isGCashNotConfigured = paymongoResult.errors?.some(error => 
        error.code === 'payment_method_not_configured' && 
        error.detail?.includes('gcash payments')
      );
      
      if (isGCashNotConfigured) {
        return res.status(400).json({
          error: 'GCash payment method not enabled',
          details: 'Your PayMongo account is not configured to accept GCash payments. Please enable GCash in your PayMongo dashboard or contact PayMongo support.',
          code: 'GCASH_NOT_ENABLED',
          suggestions: [
            'Enable GCash in PayMongo Dashboard → Settings → Payment Methods',
            'Complete business verification if required',
            'Contact PayMongo support for assistance',
            'Use card payments as alternative while waiting for GCash approval'
          ]
        });
      }
      
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

    // Send notifications
    try {
      await notifyPaymentConfirmed(activatedSubscription.user_id, {
        amount: paymentData.amount,
        method: 'GCash',
        reference_number: source_id
      });
      
      await notifySubscriptionActivated(activatedSubscription.user_id, {
        plan_name: activatedSubscription.plan_name || 'Full Plan',
        price: paymentData.amount,
        next_collection_date: 'TBD'
      });
    } catch (notifError) {
      console.error('⚠️ Failed to send notifications:', notifError);
    }

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

// Cash Payment Confirmation (for collectors) - Enhanced with payment attempt tracking
const confirmCashPayment = async (req, res) => {
  try {
    const { subscription_id, collector_id, amount, notes } = req.body;
    
    if (!subscription_id || !collector_id || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: subscription_id, collector_id, and amount'
      });
    }

    // Get subscription details
    const subscription = await billingModel.getCustomerSubscriptionById(subscription_id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const amountNum = parseFloat(amount);
    
    // Record payment attempt as successful (without GPS)
    try {
      await pool.query(`
        INSERT INTO payment_attempts (
          subscription_id, user_id, collector_id, 
          outcome, amount_collected, amount_expected, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        subscription_id,
        subscription.user_id,
        collector_id,
        'paid',
        amountNum,
        subscription.price || 199,
        notes || 'Cash payment collected successfully'
      ]);
      console.log('✅ Payment attempt recorded as successful');
    } catch (attemptError) {
      console.error('⚠️ Failed to record payment attempt:', attemptError);
      // Continue anyway - payment confirmation is more important
    }

    // Activate subscription with cash payment data
    const paymentData = {
      amount: amountNum,
      payment_method: 'Cash',
      reference_number: `CASH-${Date.now()}`,
      notes: notes || 'Cash payment on collection'
    };

    const activatedSubscription = await billingModel.activateSubscription(subscription_id, paymentData);

    // Send notifications
    try {
      await notifyPaymentConfirmed(activatedSubscription.user_id, {
        amount: paymentData.amount,
        method: 'Cash',
        reference_number: paymentData.reference_number
      });
      
      await notifySubscriptionActivated(activatedSubscription.user_id, {
        plan_name: activatedSubscription.plan_name || 'Full Plan',
        price: paymentData.amount,
        next_collection_date: 'TBD'
      });
    } catch (notifError) {
      console.error('⚠️ Failed to send notifications:', notifError);
    }

    res.json({
      success: true,
      message: 'Cash payment confirmed and subscription activated',
      subscription: activatedSubscription,
      payment_attempt_recorded: true
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

// Record Failed Payment Attempt (GPS removed)
const recordPaymentAttempt = async (req, res) => {
  try {
    const { 
      subscription_id, 
      collector_id, 
      outcome, 
      notes,
      retry_scheduled_date
    } = req.body;
    
    if (!subscription_id || !collector_id || !outcome) {
      return res.status(400).json({
        error: 'Missing required fields: subscription_id, collector_id, and outcome'
      });
    }

    // Validate outcome
    const validOutcomes = ['paid', 'not_home', 'refused', 'promised_next_time', 'no_cash', 'partial_payment', 'disputed', 'cancelled'];
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({
        error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}`
      });
    }

    // Get subscription details
    const subscription = await billingModel.getCustomerSubscriptionById(subscription_id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Record payment attempt (without GPS)
    const result = await pool.query(`
      INSERT INTO payment_attempts (
        subscription_id, user_id, collector_id, 
        outcome, amount_collected, amount_expected,
        notes, retry_scheduled_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      subscription_id,
      subscription.user_id,
      collector_id,
      outcome,
      0, // No amount collected for failed attempts
      subscription.price || 199,
      notes || `Payment attempt failed: ${outcome}`,
      retry_scheduled_date || null
    ]);

    const attempt = result.rows[0];
    
    // Get updated subscription status
    const updatedSubscription = await billingModel.getCustomerSubscriptionById(subscription_id);

    res.json({
      success: true,
      message: 'Payment attempt recorded',
      attempt: {
        attempt_id: attempt.attempt_id,
        outcome: attempt.outcome,
        attempt_date: attempt.attempt_date,
        retry_scheduled_date: attempt.retry_scheduled_date
      },
      subscription_status: {
        status: updatedSubscription.status,
        payment_attempts_count: updatedSubscription.payment_attempts_count,
        payment_score: updatedSubscription.payment_score,
        requires_prepayment: updatedSubscription.requires_prepayment
      }
    });
    
  } catch (error) {
    console.error('Error recording payment attempt:', error);
    res.status(500).json({
      error: 'Failed to record payment attempt',
      details: error.message
    });
  }
};

// Get Payment Attempts for a Subscription
const getPaymentAttempts = async (req, res) => {
  try {
    const { subscription_id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        pa.*,
        c.name as collector_name,
        u.username,
        u.full_name as resident_name
      FROM payment_attempts pa
      LEFT JOIN collectors c ON pa.collector_id = c.collector_id
      LEFT JOIN users u ON pa.user_id = u.user_id
      WHERE pa.subscription_id = $1
      ORDER BY pa.attempt_date DESC, pa.attempt_time DESC
    `, [subscription_id]);

    res.json({
      success: true,
      attempts: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching payment attempts:', error);
    res.status(500).json({
      error: 'Failed to fetch payment attempts',
      details: error.message
    });
  }
};

// Get Payment Attempt Analytics
const getPaymentAttemptAnalytics = async (req, res) => {
  try {
    const { user_id, collector_id, start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM payment_attempt_analytics WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (user_id) {
      query += ` AND user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }
    
    if (start_date) {
      query += ` AND last_attempt_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND last_attempt_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    const result = await pool.query(query, params);

    res.json({
      success: true,
      analytics: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch payment analytics',
      details: error.message
    });
  }
};

// GCash QR Configuration (Environment-aware)
const GCASH_CONFIG = {
  merchant_name: process.env.GCASH_MERCHANT_NAME || "WSBS- Waste Management",
  gcash_number: process.env.GCASH_NUMBER || "09916771885",
  account_name: process.env.GCASH_ACCOUNT_NAME || "Jytt Dela Pena"
};

// PayMongo GCash Integration for Automatic Verification
const createPayMongoGCashPayment = async ({ amount, reference, description, subscription_id }) => {
  const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
  
  if (!PAYMONGO_SECRET_KEY) {
    throw new Error('PAYMONGO_SECRET_KEY environment variable is required');
  }
  
  try {
    // Create PayMongo Source for GCash
    const sourceResponse = await fetch('https://api.paymongo.com/v1/sources', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: parseInt(amount * 100), // Convert to centavos
            currency: 'PHP',
            type: 'gcash',
            redirect: {
              success: `${process.env.PUBLIC_URL || 'https://waste-scheduling-and-billing-system-for.onrender.com'}/api/billing/mobile-payment-success?subscription_id=${subscription_id}&payment_reference=${reference}`,
              failed: `${process.env.PUBLIC_URL || 'https://waste-scheduling-and-billing-system-for.onrender.com'}/api/billing/mobile-payment-failed?subscription_id=${subscription_id}&payment_reference=${reference}`
            },
            description: description || `WSBS Payment - ${reference}`
          }
        }
      })
    });

    const sourceData = await sourceResponse.json();
    
    if (!sourceResponse.ok) {
      // Check for specific GCash configuration error
      const isGCashNotConfigured = sourceData.errors?.some(error => 
        error.code === 'payment_method_not_configured' && 
        error.detail?.includes('gcash payments')
      );
      
      if (isGCashNotConfigured) {
        throw new Error('GCash payment method not enabled in PayMongo account. Please enable GCash in PayMongo Dashboard → Settings → Payment Methods');
      }
      
      throw new Error(sourceData.errors?.[0]?.detail || 'Failed to create payment source');
    }

    return {
      source_id: sourceData.data.id,
      checkout_url: sourceData.data.attributes.redirect.checkout_url,
      status: sourceData.data.attributes.status
    };
    
  } catch (error) {
    console.error('PayMongo error:', error);
    throw error;
  }
};

// Create GCash QR Payment (Like your screenshot)
const createGCashQRPayment = async (req, res) => {
  try {
    console.log('📱 Creating GCash QR Payment:', req.body);
    
    const { amount, subscription_id, user_id, description } = req.body;
    
    // DEMO MODE: Check if we should simulate GCash QR payment for defense
    const isDemoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo';
    
    if (isDemoMode) {
      console.log('🎭 DEMO MODE: Simulating GCash QR payment for defense presentation');
      
      const paymentReference = `WSBS-DEMO-${subscription_id}-${Date.now()}`;
      const demoQRUrl = `${process.env.PUBLIC_URL || 'https://waste-scheduling-and-billing-system-for.onrender.com'}/demo-gcash-payment?source_id=${paymentReference}&subscription_id=${subscription_id}`;
      
      // Generate QR code for demo URL
      const QRCode = require('qrcode');
      const qrCodeImage = await QRCode.toDataURL(demoQRUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      
      return res.json({
        success: true,
        payment_reference: paymentReference,
        qr_code_image: qrCodeImage,
        amount: parseFloat(amount),
        merchant_info: {
          name: "WSBS- Waste Management (DEMO)",
          gcash_number: "09916771885",
          account_name: "Jytt Dela Pena"
        },
        checkout_url: demoQRUrl,
        instructions: [
          "🎭 DEMO MODE - For Defense Presentation",
          "1. Scan the QR code with any QR scanner",
          "2. You'll see a demo payment page",
          "3. Payment will auto-complete in 3 seconds",
          "4. No actual money will be charged"
        ],
        expires_in: "30 minutes",
        demo_mode: true
      });
    }
    
    if (!amount || !subscription_id) {
      console.error('❌ Missing required fields:', { amount, subscription_id });
      return res.status(400).json({
        error: 'Missing required fields: amount and subscription_id'
      });
    }

    // Check PayMongo configuration
    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
    if (!PAYMONGO_SECRET_KEY) {
      console.error('❌ PayMongo Secret Key not configured');
      return res.status(500).json({
        error: 'PayMongo configuration not found. Please check server configuration.'
      });
    }

    // Create unique payment reference
    const paymentReference = `WSBS-${subscription_id}-${Date.now()}`;
    
    // Create GCash payment data (similar to your screenshot format)
    const gcashPaymentData = {
      merchant_name: GCASH_CONFIG.merchant_name,
      gcash_number: GCASH_CONFIG.gcash_number,
      account_name: GCASH_CONFIG.account_name,
      amount: parseFloat(amount),
      reference: paymentReference,
      description: description || `WSBS Subscription Payment`
    };

    // Generate GCash deep link for direct app opening with error handling
    let gcashDeepLink, gcashWebLink, paymayaDeepLink, universalPaymentLink;
    
    try {
      console.log('🔗 Generating payment deep links...');
      console.log('📊 Payment data:', { amount: parseFloat(amount), recipient: GCASH_CONFIG.gcash_number, description });
      
      // Validate payment configuration first
      const configValidation = validatePaymentConfiguration();
      if (!configValidation.isValid) {
        logPaymentError('GCash Configuration', new Error('Invalid payment configuration'), {
          errors: configValidation.errors,
          warnings: configValidation.warnings
        });
      }
      
      // Validate deep link parameters
      const deepLinkValidation = validateDeepLinkGeneration(amount, GCASH_CONFIG.gcash_number, description);
      if (!deepLinkValidation.isValid) {
        throw new Error(`Deep link validation failed: ${deepLinkValidation.errors.join(', ')}`);
      }
      
      // Additional validation for GCASH_CONFIG
      if (!GCASH_CONFIG.gcash_number) {
        throw new Error('GCash number not configured in GCASH_CONFIG');
      }
      
      const safeAmount = parseFloat(amount);
      const safeRecipient = GCASH_CONFIG.gcash_number;
      const safeMessage = encodeURIComponent(description || 'WSBS Payment');
      const safeReference = encodeURIComponent(paymentReference);
      
      // Generate GCash deep link
      gcashDeepLink = `gcash://pay?amount=${safeAmount}&recipient=${safeRecipient}&message=${safeMessage}&reference=${safeReference}`;
      console.log('✅ GCash deep link generated:', gcashDeepLink);
      
      // Generate GCash web link as fallback
      gcashWebLink = `https://m.gcash.com/gcashapp/gcash-web/send-money/mobile?amount=${safeAmount}&mobile=${safeRecipient}&message=${safeMessage}`;
      console.log('✅ GCash web link generated:', gcashWebLink);
      
      // Generate PayMaya deep link as alternative
      paymayaDeepLink = `paymaya://pay?amount=${safeAmount}&recipient=${safeRecipient}&message=${safeMessage}`;
      console.log('✅ PayMaya deep link generated:', paymayaDeepLink);
      
      // Generate universal payment link that works with multiple wallets
      universalPaymentLink = `intent://pay?amount=${safeAmount}&recipient=${safeRecipient}&message=${safeMessage}#Intent;scheme=gcash;package=com.globe.gcash.android;S.browser_fallback_url=${encodeURIComponent(gcashWebLink)};end`;
      console.log('✅ Universal payment link generated:', universalPaymentLink);
      
    } catch (linkError) {
      console.error('❌ Error generating payment deep links:', linkError);
      
      // Fallback to basic links if generation fails
      gcashDeepLink = `gcash://pay?amount=${amount}&recipient=${GCASH_CONFIG.gcash_number || '09916771885'}`;
      gcashWebLink = `https://m.gcash.com/gcashapp/gcash-web/send-money/mobile`;
      paymayaDeepLink = `paymaya://pay?amount=${amount}`;
      universalPaymentLink = gcashWebLink; // Use web link as universal fallback
      
      console.log('⚠️ Using fallback payment links due to error');
    }

    // Create PayMongo GCash payment for automatic verification
    console.log('🔄 Creating PayMongo GCash payment...');
    let paymongoPayment;
    try {
      paymongoPayment = await createPayMongoGCashPayment({
        amount: amount,
        reference: paymentReference,
        description: description || `WSBS Subscription Payment`,
        subscription_id: subscription_id
      });
      console.log('✅ PayMongo payment created:', paymongoPayment);
    } catch (paymongoError) {
      console.error('❌ PayMongo API error:', paymongoError);
      return res.status(500).json({
        error: 'Failed to create GCash QR payment',
        details: paymongoError.message,
        hint: 'Please check PayMongo configuration and try again'
      });
    }
    
    // Create QR code for the PayMongo checkout URL
    const qrCodeImage = await QRCode.toDataURL(paymongoPayment.checkout_url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    // Create table and store payment record
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS gcash_qr_payments (
        id SERIAL PRIMARY KEY,
        payment_reference VARCHAR(100) UNIQUE NOT NULL,
        subscription_id INTEGER,
        user_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        qr_data TEXT,
        merchant_gcash_number VARCHAR(20),
        gcash_reference VARCHAR(100),
        receipt_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes')
      )
    `;
    
    await pool.query(createTableQuery);

    // Insert payment record
    const insertQuery = `
      INSERT INTO gcash_qr_payments (
        payment_reference, subscription_id, user_id, amount, 
        qr_data, merchant_gcash_number
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      paymentReference,
      subscription_id,
      user_id,
      amount,
      paymongoPayment.checkout_url,
      GCASH_CONFIG.gcash_number
    ]);

    // Validate payment options before sending response
    const paymentOptionsToSend = {
      gcash_deep_link: gcashDeepLink,
      gcash_web_link: gcashWebLink,
      paymaya_deep_link: paymayaDeepLink,
      universal_link: universalPaymentLink
    };
    
    const optionsValidation = validatePaymentOptions(paymentOptionsToSend);
    if (!optionsValidation.isValid) {
      console.warn('⚠️ Payment options validation failed, but continuing with response');
      logPaymentError('Payment Options Validation', new Error('Invalid payment options'), {
        errors: optionsValidation.errors,
        warnings: optionsValidation.warnings,
        paymentOptions: paymentOptionsToSend
      });
    }

    res.json({
      success: true,
      payment_reference: paymentReference,
      qr_code_image: qrCodeImage,
      amount: parseFloat(amount),
      merchant_info: {
        name: GCASH_CONFIG.merchant_name,
        gcash_number: GCASH_CONFIG.gcash_number,
        account_name: GCASH_CONFIG.account_name
      },
      checkout_url: paymongoPayment.checkout_url,
      source_id: paymongoPayment.source_id,
      // Add deep links for direct app opening
      payment_options: paymentOptionsToSend,
      instructions: [
        "Option 1: Tap 'Open in GCash' to pay directly in GCash app",
        "Option 2: Scan QR code with any QR scanner",
        "Option 3: Use PayMongo checkout for card payments",
        "Payment will be automatically verified"
      ],
      expires_in: "30 minutes",
      // Add validation status for debugging
      validation_status: {
        config_valid: configValidation?.isValid || false,
        deep_links_valid: deepLinkValidation?.isValid || false,
        options_valid: optionsValidation.isValid
      }
    });

  } catch (error) {
    console.error('Error creating GCash QR payment:', error);
    
    // Log detailed error information
    logPaymentError('GCash QR Payment Creation', error, {
      amount,
      subscription_id,
      user_id,
      description,
      gcash_config: {
        merchant_name: GCASH_CONFIG.merchant_name,
        gcash_number: GCASH_CONFIG.gcash_number ? 'SET' : 'NOT SET',
        account_name: GCASH_CONFIG.account_name ? 'SET' : 'NOT SET'
      },
      environment: {
        demo_mode: process.env.DEMO_MODE,
        paymongo_mode: process.env.PAYMONGO_MODE,
        node_env: process.env.NODE_ENV
      }
    });
    
    // Return user-friendly error message
    res.status(500).json({
      error: 'Failed to create GCash QR payment',
      details: error.message,
      troubleshooting: {
        common_causes: [
          'PayMongo account not configured for GCash',
          'Invalid GCash configuration',
          'Network connectivity issues',
          'Invalid payment parameters'
        ],
        suggested_actions: [
          'Check PayMongo dashboard for GCash enablement',
          'Verify environment variables are set',
          'Try demo mode for testing',
          'Contact support if issue persists'
        ]
      },
      support_info: {
        reference: paymentReference || `ERR-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Upload receipt for verification
const uploadGCashReceipt = async (req, res) => {
  try {
    const { payment_reference, gcash_reference, receipt_image } = req.body;
    
    if (!payment_reference || !gcash_reference) {
      return res.status(400).json({
        error: 'Payment reference and GCash reference are required'
      });
    }

    // Update payment with receipt
    const updateQuery = `
      UPDATE gcash_qr_payments 
      SET 
        gcash_reference = $1,
        receipt_image = $2,
        status = 'pending_verification',
        verified_at = NOW()
      WHERE payment_reference = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      gcash_reference,
      receipt_image,
      payment_reference
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment reference not found'
      });
    }

    res.json({
      success: true,
      message: 'Receipt uploaded successfully. Payment is being verified.',
      status: 'pending_verification'
    });

  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({
      error: 'Failed to upload receipt',
      details: error.message
    });
  }
};

// Admin: Verify payment and activate subscription
const verifyGCashQRPayment = async (req, res) => {
  try {
    const { payment_reference, approved } = req.body;
    
    if (!payment_reference || approved === undefined) {
      return res.status(400).json({
        error: 'Payment reference and approval status are required'
      });
    }

    const status = approved ? 'verified' : 'rejected';
    
    // Update payment status
    const updateQuery = `
      UPDATE gcash_qr_payments 
      SET status = $1
      WHERE payment_reference = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [status, payment_reference]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    const payment = result.rows[0];

    if (approved) {
      // Activate subscription
      const activateQuery = `
        UPDATE customer_subscriptions 
        SET 
          status = 'active',
          payment_status = 'paid',
          payment_method = 'gcash_qr',
          updated_at = NOW()
        WHERE subscription_id = $1
      `;
      
      await pool.query(activateQuery, [payment.subscription_id]);

      // Create payment record
      const paymentQuery = `
        INSERT INTO payments (
          subscription_id, amount, payment_method, 
          payment_date, reference_number, status
        ) VALUES ($1, $2, $3, NOW(), $4, $5)
      `;
      
      await pool.query(paymentQuery, [
        payment.subscription_id,
        payment.amount,
        'GCash QR',
        payment.gcash_reference,
        'completed'
      ]);
    }

    res.json({
      success: true,
      message: approved ? 'Payment verified and subscription activated' : 'Payment rejected',
      payment: payment
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      details: error.message
    });
  }
};

// Get payment status
const getGCashQRPaymentStatus = async (req, res) => {
  try {
    const { payment_reference } = req.params;
    
    const query = `
      SELECT gqp.*, cs.status as subscription_status
      FROM gcash_qr_payments gqp
      LEFT JOIN customer_subscriptions cs ON gqp.subscription_id = cs.subscription_id
      WHERE gqp.payment_reference = $1
    `;
    
    const result = await pool.query(query, [payment_reference]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    const payment = result.rows[0];
    
    res.json({
      success: true,
      payment: {
        reference: payment.payment_reference,
        amount: payment.amount,
        status: payment.status,
        subscription_status: payment.subscription_status,
        created_at: payment.created_at,
        expires_at: payment.expires_at,
        gcash_reference: payment.gcash_reference
      }
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      details: error.message
    });
  }
};

// Get pending payments for admin
const getPendingGCashQRPayments = async (req, res) => {
  try {
    const query = `
      SELECT 
        gqp.*,
        u.username,
        COALESCE(un.first_name || ' ' || un.last_name, u.username) as user_name
      FROM gcash_qr_payments gqp
      JOIN users u ON gqp.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE gqp.status = 'pending_verification'
      ORDER BY gqp.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      pending_payments: result.rows
    });

  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({
      error: 'Failed to get pending payments',
      details: error.message
    });
  }
};

// PayMongo Webhook Handler for Automatic Payment Verification
const handlePayMongoWebhook = async (req, res) => {
  try {
    const { data } = req.body;
    
    if (data.attributes.type === 'source.chargeable') {
      const sourceId = data.attributes.data.id;
      
      // Find payment by source_id
      const findQuery = `
        SELECT * FROM gcash_qr_payments 
        WHERE qr_data = $1 AND status = 'pending'
      `;
      
      const paymentResult = await pool.query(findQuery, [sourceId]);
      
      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0];
        
        // Update payment status to verified
        const updateQuery = `
          UPDATE gcash_qr_payments 
          SET status = 'verified', verified_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        
        await pool.query(updateQuery, [payment.id]);
        
        // Activate subscription
        const activateQuery = `
          UPDATE customer_subscriptions 
          SET 
            status = 'active',
            payment_status = 'paid',
            payment_method = 'gcash_paymongo',
            updated_at = NOW()
          WHERE subscription_id = $1
        `;
        
        await pool.query(activateQuery, [payment.subscription_id]);
        
        console.log(`Payment automatically verified for subscription ${payment.subscription_id}`);
      }
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
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
  
  // GCash QR Integration
  createGCashQRPayment,
  uploadGCashReceipt,
  verifyGCashQRPayment,
  getGCashQRPaymentStatus,
  getPendingGCashQRPayments,
  handlePayMongoWebhook,

  // Manual cancellation
  cancelSubscription,
  
  // Payment Attempt Tracking
  recordPaymentAttempt,
  getPaymentAttempts,
  getPaymentAttemptAnalytics
}; 