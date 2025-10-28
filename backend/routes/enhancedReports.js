const express = require('express');
const router = express.Router();
const EnhancedReportController = require('../controller/enhancedReportController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Enhanced Reports Routes for WSBS Management
 * Provides user-friendly report generation with proper branding
 */

// Generate enhanced report with simplified table structure
router.post('/generate-enhanced', authenticateJWT, EnhancedReportController.generateEnhancedReport);

// Generate enhanced PDF with WSBS branding
router.post('/generate-enhanced-pdf', authenticateJWT, EnhancedReportController.generateEnhancedPDF);

// Get report suggestions based on data analysis
router.get('/suggestions', authenticateJWT, EnhancedReportController.getReportSuggestions);

module.exports = router;
