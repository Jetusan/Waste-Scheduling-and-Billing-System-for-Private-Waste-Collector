const express = require('express');
const router = express.Router();
const billingController = require('../controller/billingController');

// Subscription Plans Routes
router.get('/subscription-plans', billingController.getAllSubscriptionPlans);
router.get('/subscription-plans/:planId', billingController.getSubscriptionPlanById);
router.post('/subscription-plans', billingController.createSubscriptionPlan);

// Customer Subscriptions Routes
router.get('/subscriptions', billingController.getAllCustomerSubscriptions);
router.get('/subscriptions/:subscriptionId', billingController.getCustomerSubscriptionById);
router.post('/subscriptions', billingController.createCustomerSubscription);
router.post('/mobile-subscription', billingController.createMobileSubscription);

// Invoices Routes
router.get('/invoices', billingController.getAllInvoices);
router.get('/invoices/:invoiceId', billingController.getInvoiceById);
router.post('/invoices', billingController.createInvoice);
router.put('/invoices/:invoiceId/status', billingController.updateInvoiceStatus);
router.put('/invoices/:invoiceId/late-fees', billingController.addLateFees);

// Payments Routes
router.get('/invoices/:invoiceId/payments', billingController.getPaymentsByInvoiceId);
router.post('/payments', billingController.createPayment);

// Billing History Routes
router.get('/history', billingController.getBillingHistory);

// Auto-generation Routes
router.post('/generate-invoices', billingController.generateMonthlyInvoices);

// Dashboard Routes
router.get('/stats', billingController.getBillingStats);

module.exports = router; 