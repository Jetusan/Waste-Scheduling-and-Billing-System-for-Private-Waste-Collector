const express = require('express');
const router = express.Router();
const lateFeeService = require('../services/lateFeeService');
const lateFeeScheduler = require('../services/lateFeeScheduler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Manual late fee processing (admin only)
router.post('/process', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Manual late fee processing requested by admin');
    
    const result = await lateFeeService.processLateFees();
    
    res.json({
      success: true,
      message: `Late fee processing completed successfully`,
      data: {
        processed: result.processed,
        totalFees: result.totalFees,
        lateFeeAmount: result.lateFeeAmount,
        gracePeriodDays: result.gracePeriodDays
      }
    });
    
  } catch (error) {
    console.error('❌ Error in manual late fee processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process late fees',
      details: error.message
    });
  }
});

// Get late fee statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await lateFeeService.getLateFeeStats(startDate, endDate);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Error getting late fee stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get late fee statistics',
      details: error.message
    });
  }
});

// Check if specific invoice is eligible for late fee
router.get('/check-eligibility/:invoiceId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const eligibility = await lateFeeService.isEligibleForLateFee(invoiceId);
    
    res.json({
      success: true,
      data: eligibility
    });
    
  } catch (error) {
    console.error('❌ Error checking late fee eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check late fee eligibility',
      details: error.message
    });
  }
});

// Get scheduler status
router.get('/scheduler/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = lateFeeScheduler.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
      details: error.message
    });
  }
});

// Manual scheduler trigger (admin only)
router.post('/scheduler/run', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Manual scheduler run requested by admin');
    
    const result = await lateFeeScheduler.runManually();
    
    res.json({
      success: true,
      message: 'Manual late fee processing completed',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error in manual scheduler run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run manual late fee processing',
      details: error.message
    });
  }
});

// Get overdue invoices (for admin review)
router.get('/overdue-invoices', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { pool } = require('../config/db');
    
    // Get current pricing for grace period
    const pricingQuery = `
      SELECT config_data FROM pricing_config 
      WHERE is_active = true 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    let gracePeriodDays = 7; // Default
    try {
      const pricingResult = await pool.query(pricingQuery);
      if (pricingResult.rows.length > 0) {
        const pricingConfig = pricingResult.rows[0].config_data;
        gracePeriodDays = pricingConfig.lateFees?.gracePeriodDays || 7;
      }
    } catch (pricingError) {
      console.log('⚠️ Using default grace period:', pricingError.message);
    }
    
    const overdueQuery = `
      SELECT 
        i.invoice_id,
        i.invoice_number,
        i.user_id,
        i.amount,
        i.due_date,
        i.status,
        i.late_fee_applied,
        i.late_fee_amount,
        u.username,
        u.email,
        CURRENT_DATE - i.due_date as days_overdue,
        CASE 
          WHEN CURRENT_DATE - i.due_date > ${gracePeriodDays} THEN true
          ELSE false
        END as eligible_for_late_fee
      FROM invoices i
      JOIN users u ON i.user_id = u.user_id
      WHERE i.status = 'unpaid'
        AND i.due_date < CURRENT_DATE
        AND i.invoice_type = 'subscription'
      ORDER BY i.due_date ASC
    `;
    
    const result = await pool.query(overdueQuery);
    
    res.json({
      success: true,
      data: {
        invoices: result.rows,
        gracePeriodDays: gracePeriodDays,
        summary: {
          total_overdue: result.rows.length,
          eligible_for_late_fee: result.rows.filter(inv => inv.eligible_for_late_fee && !inv.late_fee_applied).length,
          already_has_late_fee: result.rows.filter(inv => inv.late_fee_applied).length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting overdue invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overdue invoices',
      details: error.message
    });
  }
});

module.exports = router;
