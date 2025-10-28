const balanceAwareInvoicing = require('../models/balanceAwareInvoicing');
const billingModel = require('../models/billingModel');
const { notifyMonthlyInvoicesGenerated } = require('../services/notificationService');

/**
 * Enhanced billing controller with balance-aware invoice generation
 * This replaces the standard monthly invoice generation with balance consideration
 */

// Enhanced monthly invoice generation with balance consideration
const generateBalanceAwareMonthlyInvoices = async (req, res) => {
  try {
    console.log('🔄 Starting balance-aware monthly invoice generation...');
    
    const invoiceResults = await balanceAwareInvoicing.generateBalanceAwareMonthlyInvoices();
    
    // Calculate statistics
    const stats = {
      total_invoices: invoiceResults.length,
      total_original_amount: 0,
      total_credit_applied: 0,
      total_final_amount: 0,
      zero_amount_invoices: 0,
      users_with_credits: 0
    };
    
    invoiceResults.forEach(result => {
      const { invoice, balanceInfo } = result;
      stats.total_original_amount += balanceInfo.credit_applied + parseFloat(invoice.amount);
      stats.total_credit_applied += balanceInfo.credit_applied;
      stats.total_final_amount += parseFloat(invoice.amount);
      
      if (parseFloat(invoice.amount) === 0) {
        stats.zero_amount_invoices++;
      }
      
      if (balanceInfo.credit_applied > 0) {
        stats.users_with_credits++;
      }
    });
    
    console.log('📊 Balance-Aware Invoice Generation Summary:', stats);
    
    // Send enhanced admin notification
    try {
      await notifyBalanceAwareInvoicesGenerated(stats);
    } catch (notifError) {
      console.error('⚠️ Failed to send balance-aware invoice notification:', notifError);
    }
    
    res.json({ 
      message: `Generated ${stats.total_invoices} balance-aware invoices`,
      statistics: stats,
      invoices: invoiceResults.map(r => r.invoice),
      balance_summary: {
        users_with_credits_applied: stats.users_with_credits,
        total_credits_applied: `₱${stats.total_credit_applied.toFixed(2)}`,
        original_billing_amount: `₱${stats.total_original_amount.toFixed(2)}`,
        final_billing_amount: `₱${stats.total_final_amount.toFixed(2)}`,
        savings_for_users: `₱${stats.total_credit_applied.toFixed(2)}`
      }
    });
  } catch (error) {
    console.error('❌ Error generating balance-aware monthly invoices:', error);
    res.status(500).json({ 
      error: 'Failed to generate balance-aware monthly invoices', 
      details: error.message 
    });
  }
};

// Enhanced renewal with balance consideration
const renewSubscriptionWithBalance = async (req, res) => {
  try {
    const { user_id, payment_method } = req.body;
    
    if (!user_id || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: user_id, payment_method' });
    }
    
    console.log('🔄 Starting balance-aware subscription renewal for user:', user_id);
    
    // Get active subscription details
    const subscription = await billingModel.getActiveSubscription(user_id);
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found for renewal' });
    }
    
    // Get plan details
    const plan = await billingModel.getSubscriptionPlanById(subscription.plan_id);
    
    // Create balance-aware renewal invoice
    const renewalResult = await balanceAwareInvoicing.renewWithBalanceConsideration(
      user_id,
      payment_method,
      subscription.subscription_id,
      plan.price,
      plan.plan_name
    );
    
    console.log('✅ Balance-aware renewal successful:', {
      user_id: user_id,
      invoice_number: renewalResult.invoice.invoice_number,
      original_amount: `₱${renewalResult.balanceInfo.credit_applied + parseFloat(renewalResult.invoice.amount)}`,
      credit_applied: `₱${renewalResult.balanceInfo.credit_applied}`,
      final_amount: `₱${renewalResult.invoice.amount}`,
      balance_after: `₱${renewalResult.balanceInfo.balance_after_invoice}`
    });
    
    res.json({
      success: true,
      message: 'Subscription renewed with balance consideration',
      invoice: renewalResult.invoice,
      balance_info: {
        previous_balance: `₱${renewalResult.balanceInfo.previous_balance}`,
        credit_applied: `₱${renewalResult.balanceInfo.credit_applied}`,
        original_amount: `₱${renewalResult.balanceInfo.credit_applied + parseFloat(renewalResult.invoice.amount)}`,
        final_amount: `₱${renewalResult.invoice.amount}`,
        balance_after_renewal: `₱${renewalResult.balanceInfo.balance_after_invoice}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error in balance-aware renewal:', error);
    res.status(500).json({ 
      error: 'Failed to renew subscription with balance consideration', 
      details: error.message 
    });
  }
};

// Get user balance summary
const getUserBalanceSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const balanceInfo = await balanceAwareInvoicing.getUserCurrentBalance(userId);
    
    const summary = {
      user_id: userId,
      current_balance: parseFloat(balanceInfo.current_balance),
      total_billed: parseFloat(balanceInfo.total_billed),
      total_paid: parseFloat(balanceInfo.total_paid),
      balance_status: parseFloat(balanceInfo.current_balance) > 0 ? 'owes_money' : 
                     parseFloat(balanceInfo.current_balance) < 0 ? 'has_credit' : 'balanced',
      available_credit: parseFloat(balanceInfo.current_balance) < 0 ? 
                       Math.abs(parseFloat(balanceInfo.current_balance)) : 0
    };
    
    res.json(summary);
  } catch (error) {
    console.error('❌ Error getting user balance summary:', error);
    res.status(500).json({ 
      error: 'Failed to get user balance summary', 
      details: error.message 
    });
  }
};

// Enhanced notification function for balance-aware invoices
const notifyBalanceAwareInvoicesGenerated = async (stats) => {
  const message = `
📊 Balance-Aware Monthly Invoices Generated

📈 Summary:
• Total Invoices: ${stats.total_invoices}
• Users with Credits: ${stats.users_with_credits}
• Zero-Amount Invoices: ${stats.zero_amount_invoices}

💰 Financial Impact:
• Original Amount: ₱${stats.total_original_amount.toFixed(2)}
• Credits Applied: ₱${stats.total_credit_applied.toFixed(2)}
• Final Amount: ₱${stats.total_final_amount.toFixed(2)}
• User Savings: ₱${stats.total_credit_applied.toFixed(2)}

The system automatically applied user credits to reduce invoice amounts where applicable.
  `;
  
  console.log('📧 Balance-Aware Invoice Notification:', message);
  // Here you would send the actual notification (email, SMS, etc.)
};

module.exports = {
  generateBalanceAwareMonthlyInvoices,
  renewSubscriptionWithBalance,
  getUserBalanceSummary,
  notifyBalanceAwareInvoicesGenerated
};
