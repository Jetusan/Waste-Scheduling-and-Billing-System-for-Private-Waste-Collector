const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../config/dbAdmin');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
// Make OCR optional for deployment
let PaymentVerificationOCR = null;
try {
  PaymentVerificationOCR = require('../utils/paymentOCR');
} catch (error) {
  console.warn('⚠️ OCR dependencies not available. Manual verification will be used.');
}

// Ensure upload directory exists
const uploadDir = 'uploads/payment-proofs/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Fraud Prevention Utilities
const fraudPrevention = {
  // Generate unique hash for uploaded images
  generateImageHash: (imagePath) => {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return crypto.createHash('md5').update(imageBuffer).digest('hex');
    } catch (error) {
      console.error('Error generating image hash:', error);
      return null;
    }
  },

  // Check for duplicate image submissions
  checkDuplicateImage: async (imageHash, userId) => {
    try {
      const duplicate = await pool.query(`
        SELECT id, created_at, status FROM manual_payment_verifications 
        WHERE image_hash = $1 AND user_id = $2
        ORDER BY created_at DESC LIMIT 1
      `, [imageHash, userId]);
      
      return duplicate.rows.length > 0 ? duplicate.rows[0] : null;
    } catch (error) {
      console.error('Error checking duplicate image:', error);
      return null;
    }
  },

  // Enhanced OCR validation
  validatePaymentDetails: (ocrText, expectedAmount, expectedRecipient = '09916771885') => {
    const validation = {
      hasCorrectRecipient: false,
      hasCorrectAmount: false,
      hasRecentDate: false,
      hasGCashKeywords: false,
      confidence: 0
    };

    if (!ocrText) return validation;

    const text = ocrText.toLowerCase();

    // Check for correct GCash recipient number
    const phoneNumbers = ocrText.match(/09\d{9}/g) || [];
    validation.hasCorrectRecipient = phoneNumbers.includes(expectedRecipient);

    // Check for correct amount
    const amounts = ocrText.match(/₱[\d,]+\.?\d*/g) || [];
    const numericAmounts = amounts.map(a => parseFloat(a.replace(/[₱,]/g, '')));
    validation.hasCorrectAmount = numericAmounts.includes(parseFloat(expectedAmount));

    // Check for GCash keywords
    const requiredKeywords = ['gcash', 'sent', 'successful', 'transaction', 'transfer'];
    const foundKeywords = requiredKeywords.filter(keyword => text.includes(keyword));
    validation.hasGCashKeywords = foundKeywords.length >= 2;

    // Check for recent date patterns (basic check)
    const currentYear = new Date().getFullYear();
    const hasCurrentYear = text.includes(currentYear.toString());
    validation.hasRecentDate = hasCurrentYear;

    // Calculate confidence score
    let score = 0;
    if (validation.hasCorrectRecipient) score += 40;
    if (validation.hasCorrectAmount) score += 30;
    if (validation.hasGCashKeywords) score += 20;
    if (validation.hasRecentDate) score += 10;
    
    validation.confidence = score;

    return validation;
  },

  // Check user submission behavior
  checkSubmissionBehavior: async (userId) => {
    try {
      // Check submissions in last hour
      const recentSubmissions = await pool.query(`
        SELECT COUNT(*) as count 
        FROM manual_payment_verifications 
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
      `, [userId]);

      // Check failed submissions in last 24 hours
      const recentFailures = await pool.query(`
        SELECT COUNT(*) as count 
        FROM manual_payment_verifications 
        WHERE user_id = $1 AND status IN ('rejected', 'auto_rejected') 
        AND created_at > NOW() - INTERVAL '24 hours'
      `, [userId]);

      return {
        recentSubmissions: parseInt(recentSubmissions.rows[0].count),
        recentFailures: parseInt(recentFailures.rows[0].count),
        isSuspicious: recentSubmissions.rows[0].count > 3 || recentFailures.rows[0].count > 2
      };
    } catch (error) {
      console.error('Error checking submission behavior:', error);
      return { recentSubmissions: 0, recentFailures: 0, isSuspicious: false };
    }
  }
};

// POST /api/manual-payments/submit - Submit manual payment proof
router.post('/submit', authenticateJWT, upload.single('paymentProof'), async (req, res) => {
  try {
    const { 
      subscription_id, 
      amount, 
      reference_number, 
      gcash_number, 
      payment_date,
      notes 
    } = req.body;
    
    const user_id = req.user.user_id;
    
    if (!subscription_id || !amount || !req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subscription ID, amount, and payment proof are required' 
      });
    }

    // Verify subscription belongs to user
    const subscriptionCheck = await pool.query(
      'SELECT * FROM customer_subscriptions WHERE subscription_id = $1 AND user_id = $2',
      [subscription_id, user_id]
    );

    if (subscriptionCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }

    const paymentProofUrl = `/uploads/payment-proofs/${req.file.filename}`;
    const fullImagePath = path.join(process.cwd(), 'uploads/payment-proofs', req.file.filename);

    // ========== FRAUD PREVENTION CHECKS ==========
    console.log('🛡️ Starting fraud prevention checks...');
    
    // 1. Generate image hash for duplicate detection
    const imageHash = fraudPrevention.generateImageHash(fullImagePath);
    if (!imageHash) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process payment proof image'
      });
    }

    // 2. Check for duplicate image submissions
    const duplicateCheck = await fraudPrevention.checkDuplicateImage(imageHash, user_id);
    if (duplicateCheck) {
      console.log('🚨 Duplicate image detected:', duplicateCheck);
      return res.status(400).json({
        success: false,
        message: 'This payment proof has already been submitted',
        details: `Previously submitted on ${new Date(duplicateCheck.created_at).toLocaleDateString()}`
      });
    }

    // 3. Check user submission behavior
    const behaviorCheck = await fraudPrevention.checkSubmissionBehavior(user_id);
    if (behaviorCheck.isSuspicious) {
      console.log('🚨 Suspicious submission behavior detected:', behaviorCheck);
      return res.status(429).json({
        success: false,
        message: 'Too many submission attempts. Please wait before trying again.',
        details: `Recent submissions: ${behaviorCheck.recentSubmissions}, Recent failures: ${behaviorCheck.recentFailures}`
      });
    }

    // Initialize OCR verification
    let verificationResult = null;
    let autoVerificationStatus = 'pending';
    let verificationReport = '';

    if (PaymentVerificationOCR) {
      try {
        const ocrVerifier = new PaymentVerificationOCR();
        
        // Perform automatic verification
        console.log('🔍 Starting automatic payment verification...');
        verificationResult = await ocrVerifier.verifyPaymentProof(fullImagePath, amount);
        
        if (verificationResult.success) {
          verificationReport = ocrVerifier.generateVerificationReport(verificationResult);
          console.log('📊 Verification Report:\n', verificationReport);
          
          // 4. Enhanced OCR validation for fraud detection
          const enhancedValidation = fraudPrevention.validatePaymentDetails(
            verificationResult.extractedText || '', 
            amount
          );
          
          console.log('🔍 Enhanced validation results:', enhancedValidation);
          
          // Auto-reject if critical validations fail
          if (!enhancedValidation.hasCorrectRecipient) {
            autoVerificationStatus = 'auto_rejected';
            verificationReport += '\n❌ FRAUD ALERT: Wrong GCash recipient number detected';
            console.log('🚨 FRAUD ALERT: Wrong recipient number');
          } else if (!enhancedValidation.hasCorrectAmount) {
            autoVerificationStatus = 'auto_rejected';
            verificationReport += '\n❌ FRAUD ALERT: Payment amount mismatch detected';
            console.log('🚨 FRAUD ALERT: Amount mismatch');
          } else if (!enhancedValidation.hasGCashKeywords) {
            autoVerificationStatus = 'auto_rejected';
            verificationReport += '\n❌ FRAUD ALERT: Missing GCash transaction keywords';
            console.log('🚨 FRAUD ALERT: Missing GCash keywords');
          } else {
            // Use combined confidence score
            const combinedConfidence = Math.min(verificationResult.confidence, enhancedValidation.confidence);
            
            if (verificationResult.isValid && combinedConfidence >= 90) {
              autoVerificationStatus = 'auto_verified';
              console.log('✅ Payment auto-verified with high confidence!');
            } else if (combinedConfidence >= 70) {
              autoVerificationStatus = 'needs_review';
              console.log('⚠️ Payment needs manual review');
            } else {
              autoVerificationStatus = 'auto_rejected';
              console.log('❌ Payment auto-rejected due to low confidence');
            }
          }
          
          // Add enhanced validation to report
          verificationReport += `\n\n🛡️ Enhanced Fraud Detection:
- Correct Recipient: ${enhancedValidation.hasCorrectRecipient ? '✅' : '❌'}
- Correct Amount: ${enhancedValidation.hasCorrectAmount ? '✅' : '❌'}
- GCash Keywords: ${enhancedValidation.hasGCashKeywords ? '✅' : '❌'}
- Recent Date: ${enhancedValidation.hasRecentDate ? '✅' : '❌'}
- Fraud Score: ${enhancedValidation.confidence}/100`;
        }
      } catch (error) {
        console.error('OCR Verification Error:', error);
        verificationReport = `OCR Error: ${error.message}`;
        autoVerificationStatus = 'needs_review'; // Fallback to manual review
      }
    } else {
      console.log('⚠️ OCR not available - defaulting to manual review');
      autoVerificationStatus = 'needs_review';
      verificationReport = 'OCR dependencies not installed - manual verification required';
    }

    // Insert manual payment verification record with OCR results and fraud prevention data
    const result = await pool.query(`
      INSERT INTO manual_payment_verifications 
      (subscription_id, user_id, amount, reference_number, payment_proof_url, 
       gcash_number, payment_date, notes, verification_status, ocr_confidence, 
       ocr_report, ocr_extracted_data, image_hash, fraud_checks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING verification_id
    `, [
      subscription_id, 
      user_id, 
      parseFloat(amount), 
      reference_number || null,
      paymentProofUrl,
      gcash_number || null,
      payment_date || new Date(),
      notes || null,
      autoVerificationStatus,
      verificationResult?.confidence || 0,
      verificationReport,
      JSON.stringify(verificationResult?.paymentDetails || {}),
      imageHash,
      JSON.stringify({
        behaviorCheck,
        duplicateCheck: duplicateCheck ? 'found' : 'none',
        timestamp: new Date().toISOString()
      })
    ]);

    // Handle different verification outcomes
    if (autoVerificationStatus === 'auto_verified') {
      // Auto-approve high confidence payments
      await pool.query(`
        UPDATE customer_subscriptions 
        SET status = 'active', payment_status = 'paid', manual_payment_status = 'verified'
        WHERE subscription_id = $1
      `, [subscription_id]);

      // Create invoice record
      await pool.query(`
        INSERT INTO invoices (user_id, subscription_id, amount, status, payment_method, paid_at)
        VALUES ($1, $2, $3, 'paid', 'auto_verified_gcash', NOW())
      `, [user_id, subscription_id, parseFloat(amount)]);

      // Update verification record
      await pool.query(`
        UPDATE manual_payment_verifications 
        SET verification_status = 'verified', verified_at = NOW()
        WHERE verification_id = $1
      `, [result.rows[0].verification_id]);

      // Notify user of auto-approval
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, created_at)
        VALUES ($1, $2, $3, 'payment_verified', NOW())
      `, [
        user_id,
        '✅ Payment Auto-Verified!',
        `Your GCash payment of ₱${amount} has been automatically verified and your subscription is now active!`
      ]);

      // Notify admin of auto-verification
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, created_at)
        SELECT u.user_id, $1, $2, 'auto_verification', NOW()
        FROM users u WHERE u.role_id = 1
      `, [
        '🤖 Payment Auto-Verified',
        `Payment of ₱${amount} was automatically verified with ${verificationResult?.confidence?.toFixed(1)}% confidence`
      ]);

    } else if (autoVerificationStatus === 'auto_rejected') {
      // Auto-reject low confidence payments
      await pool.query(
        'UPDATE customer_subscriptions SET manual_payment_status = $1 WHERE subscription_id = $2',
        ['rejected', subscription_id]
      );

      // Update verification record
      await pool.query(`
        UPDATE manual_payment_verifications 
        SET verification_status = 'rejected', verified_at = NOW(), 
            rejection_reason = 'Automatic verification failed - payment proof unclear or invalid'
        WHERE verification_id = $1
      `, [result.rows[0].verification_id]);

      // Notify user of auto-rejection
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, created_at)
        VALUES ($1, $2, $3, 'payment_rejected', NOW())
      `, [
        user_id,
        '❌ Payment Verification Failed',
        'Your payment proof could not be automatically verified. Please ensure the screenshot is clear and shows all payment details, then try again.'
      ]);

    } else {
      // Needs manual review
      await pool.query(
        'UPDATE customer_subscriptions SET manual_payment_status = $1 WHERE subscription_id = $2',
        ['pending_verification', subscription_id]
      );

      // Notify admin about payment needing review
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, created_at)
        SELECT u.user_id, $1, $2, 'manual_payment', NOW()
        FROM users u WHERE u.role_id = 1
      `, [
        '👀 Payment Needs Review',
        `Payment of ₱${amount} needs manual review (${verificationResult?.confidence?.toFixed(1)}% confidence)`
      ]);
    }

    return res.json({
      success: true,
      verification_id: result.rows[0].verification_id,
      message: 'Payment proof submitted successfully. Please wait for admin verification.'
    });

  } catch (error) {
    console.error('Error submitting manual payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit payment proof', 
      details: error.message 
    });
  }
});

// GET /api/manual-payments/status/:subscription_id - Check verification status
router.get('/status/:subscription_id', authenticateJWT, async (req, res) => {
  try {
    const { subscription_id } = req.params;
    const user_id = req.user.user_id;

    const result = await pool.query(`
      SELECT mpv.*, cs.manual_payment_status
      FROM manual_payment_verifications mpv
      LEFT JOIN customer_subscriptions cs ON mpv.subscription_id = cs.subscription_id
      WHERE mpv.subscription_id = $1 AND mpv.user_id = $2
      ORDER BY mpv.created_at DESC
      LIMIT 1
    `, [subscription_id, user_id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        status: 'no_submission',
        message: 'No manual payment submitted yet'
      });
    }

    const verification = result.rows[0];
    
    return res.json({
      success: true,
      verification: {
        verification_id: verification.verification_id,
        amount: verification.amount,
        status: verification.verification_status,
        submitted_at: verification.created_at,
        verified_at: verification.verified_at,
        rejection_reason: verification.rejection_reason
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to check payment status' 
    });
  }
});

// Admin routes
// GET /api/manual-payments/admin/pending - Get pending verifications
router.get('/admin/pending', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        mpv.*,
        u.username,
        u.email,
        cs.plan_id,
        sp.plan_name,
        sp.price
      FROM manual_payment_verifications mpv
      LEFT JOIN users u ON mpv.user_id = u.user_id
      LEFT JOIN customer_subscriptions cs ON mpv.subscription_id = cs.subscription_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE mpv.verification_status = 'pending'
      ORDER BY mpv.created_at DESC
    `);

    return res.json({
      success: true,
      pending_verifications: result.rows
    });

  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending verifications' 
    });
  }
});

// POST /api/manual-payments/admin/verify/:verification_id - Verify/reject payment
router.post('/admin/verify/:verification_id', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { verification_id } = req.params;
    const { action, rejection_reason } = req.body; // action: 'verify' or 'reject'
    const admin_id = req.user.user_id;

    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action must be either "verify" or "reject"' 
      });
    }

    // Get verification details
    const verificationResult = await pool.query(
      'SELECT * FROM manual_payment_verifications WHERE verification_id = $1',
      [verification_id]
    );

    if (verificationResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Verification not found' 
      });
    }

    const verification = verificationResult.rows[0];

    if (action === 'verify') {
      // Verify payment - activate subscription
      await pool.query(`
        UPDATE manual_payment_verifications 
        SET verification_status = 'verified', verified_by = $1, verified_at = NOW()
        WHERE verification_id = $2
      `, [admin_id, verification_id]);

      // Activate subscription
      await pool.query(`
        UPDATE customer_subscriptions 
        SET status = 'active', payment_status = 'paid', manual_payment_status = 'verified'
        WHERE subscription_id = $1
      `, [verification.subscription_id]);

      // Create invoice record
      await pool.query(`
        INSERT INTO invoices (user_id, subscription_id, amount, status, payment_method, paid_at)
        VALUES ($1, $2, $3, 'paid', 'manual_gcash', NOW())
      `, [verification.user_id, verification.subscription_id, verification.amount]);

      // Notify user of approval
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, created_at)
        VALUES ($1, $2, $3, 'payment_verified', NOW())
      `, [
        verification.user_id,
        '✅ Payment Verified',
        `Your GCash payment of ₱${verification.amount} has been verified and your subscription is now active!`
      ]);

    } else {
      // Reject payment
      await pool.query(`
        UPDATE manual_payment_verifications 
        SET verification_status = 'rejected', verified_by = $1, verified_at = NOW(), rejection_reason = $2
        WHERE verification_id = $3
      `, [admin_id, rejection_reason, verification_id]);

      // Update subscription status
      await pool.query(`
        UPDATE customer_subscriptions 
        SET manual_payment_status = 'rejected'
        WHERE subscription_id = $1
      `, [verification.subscription_id]);

      // Notify user of rejection
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, created_at)
        VALUES ($1, $2, $3, 'payment_rejected', NOW())
      `, [
        verification.user_id,
        '❌ Payment Verification Failed',
        `Your GCash payment verification was rejected. Reason: ${rejection_reason || 'Invalid payment proof'}`
      ]);
    }

    return res.json({
      success: true,
      message: action === 'verify' ? 'Payment verified successfully' : 'Payment rejected'
    });

  } catch (error) {
    console.error('Error processing verification:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process verification' 
    });
  }
});

module.exports = router;
