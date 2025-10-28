const express = require('express');
const router = express.Router();
const enhancedBillingController = require('../controller/enhancedBillingController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Enhanced billing routes with balance-aware invoice generation
 * These routes provide balance consideration for regular collections
 */

// Generate monthly invoices with balance consideration
router.post('/generate-balance-aware-invoices', 
  enhancedBillingController.generateBalanceAwareMonthlyInvoices
);

// Renew subscription with balance consideration
router.post('/renew-with-balance', 
  authenticateJWT, 
  enhancedBillingController.renewSubscriptionWithBalance
);

// Get user balance summary
router.get('/user-balance/:userId', 
  enhancedBillingController.getUserBalanceSummary
);

// Test endpoint to check balance for specific user
router.get('/test-balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const balanceAwareInvoicing = require('../models/balanceAwareInvoicing');
    
    const balance = await balanceAwareInvoicing.getUserCurrentBalance(userId);
    
    res.json({
      user_id: userId,
      balance_info: balance,
      interpretation: {
        owes_money: parseFloat(balance.current_balance) > 0,
        has_credit: parseFloat(balance.current_balance) < 0,
        is_balanced: parseFloat(balance.current_balance) === 0,
        credit_amount: parseFloat(balance.current_balance) < 0 ? 
                      Math.abs(parseFloat(balance.current_balance)) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulate balance-aware invoice creation for testing
router.post('/simulate-balance-invoice', async (req, res) => {
  try {
    const { user_id, base_amount = 199 } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    const balanceAwareInvoicing = require('../models/balanceAwareInvoicing');
    
    // Get current balance
    const balance = await balanceAwareInvoicing.getUserCurrentBalance(user_id);
    
    // Simulate what the invoice would look like
    const currentBalance = parseFloat(balance.current_balance || 0);
    let finalAmount = base_amount;
    let creditApplied = 0;
    
    if (currentBalance < 0) {
      creditApplied = Math.abs(currentBalance);
      
      if (creditApplied >= base_amount) {
        finalAmount = 0;
        creditApplied = base_amount;
      } else {
        finalAmount = base_amount - creditApplied;
      }
    }
    
    res.json({
      user_id: user_id,
      current_balance: currentBalance,
      simulation: {
        original_invoice_amount: base_amount,
        credit_available: Math.abs(currentBalance < 0 ? currentBalance : 0),
        credit_that_would_be_applied: creditApplied,
        final_invoice_amount: finalAmount,
        user_would_pay: finalAmount,
        savings: creditApplied
      },
      balance_status: currentBalance > 0 ? 'User owes money' : 
                     currentBalance < 0 ? 'User has credit' : 'Balanced'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
