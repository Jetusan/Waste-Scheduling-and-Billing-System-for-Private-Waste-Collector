const { pool } = require('../config/db');

// Get comprehensive subscription status for mobile app
const getSubscriptionStatus = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    console.log('🔍 Fetching subscription status for user:', user_id);
    
    // Get subscription with plan details
    const subscriptionQuery = `
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
    
    const subscriptionResult = await pool.query(subscriptionQuery, [user_id]);
    
    if (subscriptionResult.rows.length === 0) {
      return res.json({
        hasSubscription: false,
        message: 'No subscription found'
      });
    }
    
    const subscription = subscriptionResult.rows[0];
    
    // Get latest invoice for this subscription
    const invoiceQuery = `
      SELECT * FROM invoices 
      WHERE subscription_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [subscription.subscription_id]);
    const invoice = invoiceResult.rows[0];
    
    // Get payment history
    const paymentHistoryQuery = `
      SELECT 
        p.*,
        i.invoice_number
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.invoice_id
      WHERE i.subscription_id = $1
      ORDER BY p.payment_date DESC
      LIMIT 5
    `;
    
    const paymentHistoryResult = await pool.query(paymentHistoryQuery, [subscription.subscription_id]);
    
    // Get next collection schedule (mock data for now - you can implement actual scheduling)
    const nextCollectionDate = new Date();
    nextCollectionDate.setDate(nextCollectionDate.getDate() + 7); // Next Monday
    
    // Determine UI state based on subscription and payment status
    let uiState = 'unknown';
    let actionRequired = false;
    let primaryAction = null;
    
    if (subscription.status === 'active' && subscription.payment_status === 'paid') {
      uiState = 'active';
    } else if (subscription.status === 'pending_payment' && subscription.payment_method === 'gcash') {
      uiState = 'pending_gcash';
      actionRequired = true;
      primaryAction = 'pay_gcash';
    } else if (subscription.status === 'pending_payment' && subscription.payment_method === 'cash') {
      uiState = 'pending_cash';
      actionRequired = true;
      primaryAction = 'await_collector';
    }
    
    // Format response for mobile app
    const response = {
      hasSubscription: true,
      uiState,
      actionRequired,
      primaryAction,
      subscription: {
        id: subscription.subscription_id,
        status: subscription.status,
        paymentStatus: subscription.payment_status,
        paymentMethod: subscription.payment_method,
        billingStartDate: subscription.billing_start_date,
        createdAt: subscription.subscription_created_at,
        paymentConfirmedAt: subscription.payment_confirmed_at,
        plan: {
          name: subscription.plan_name,
          price: parseFloat(subscription.price),
          frequency: subscription.frequency,
          description: subscription.description
        }
      },
      currentInvoice: invoice ? {
        id: invoice.invoice_id,
        invoiceNumber: invoice.invoice_number,
        amount: parseFloat(invoice.amount),
        dueDate: invoice.due_date,
        status: invoice.status,
        generatedDate: invoice.generated_date,
        notes: invoice.notes
      } : null,
      nextCollection: {
        date: nextCollectionDate.toISOString().split('T')[0],
        estimatedTime: '08:00',
        status: 'scheduled'
      },
      paymentHistory: paymentHistoryResult.rows.map(payment => ({
        id: payment.payment_id,
        amount: parseFloat(payment.amount),
        method: payment.payment_method,
        date: payment.payment_date,
        invoiceNumber: payment.invoice_number,
        referenceNumber: payment.reference_number
      })),
      actions: getAvailableActions(uiState, subscription, invoice)
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription status',
      details: error.message
    });
  }
};

// Helper function to determine available actions based on state
const getAvailableActions = (uiState, subscription, invoice) => {
  const actions = [];
  
  switch (uiState) {
    case 'active':
      actions.push(
        { id: 'view_schedule', label: 'View Collection Schedule', type: 'navigation' },
        { id: 'payment_history', label: 'Payment History', type: 'navigation' },
        { id: 'update_address', label: 'Update Address', type: 'form' },
        { id: 'contact_support', label: 'Contact Support', type: 'contact' }
      );
      break;
      
    case 'pending_gcash':
      actions.push(
        { id: 'pay_gcash', label: 'Pay Now via GCash', type: 'payment', primary: true },
        { id: 'change_payment_method', label: 'Change to Cash Payment', type: 'form' },
        { id: 'view_invoice', label: 'View Invoice Details', type: 'navigation' }
      );
      break;
      
    case 'pending_cash':
      actions.push(
        { id: 'track_collector', label: 'Track Collector', type: 'navigation', primary: true },
        { id: 'change_to_gcash', label: 'Switch to GCash', type: 'payment' },
        { id: 'collector_contact', label: 'Call Collector', type: 'contact' }
      );
      break;
  }
  
  return actions;
};

module.exports = {
  getSubscriptionStatus
};
