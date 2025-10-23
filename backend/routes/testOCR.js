const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PaymentVerificationOCR = require('../utils/paymentOCR');

// Configure multer for test uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const testDir = 'uploads/test-ocr/';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    cb(null, testDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-test';
    cb(null, 'test-ocr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

// POST /api/test-ocr - Test OCR verification
router.post('/', upload.single('testImage'), async (req, res) => {
  try {
    const { expectedAmount } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload a test image' 
      });
    }

    const fullImagePath = path.join(process.cwd(), 'uploads/test-ocr', req.file.filename);
    
    console.log('🧪 Testing OCR with image:', fullImagePath);
    console.log('💰 Expected amount:', expectedAmount);

    // Initialize OCR verification
    const ocrVerifier = new PaymentVerificationOCR();
    
    // Perform verification
    const verificationResult = await ocrVerifier.verifyPaymentProof(fullImagePath, expectedAmount || '199');
    
    // Generate report
    const report = ocrVerifier.generateVerificationReport(verificationResult);
    
    console.log('📊 Test OCR Results:\n', report);

    return res.json({
      success: true,
      verification: verificationResult,
      report: report,
      testFile: req.file.filename,
      message: 'OCR test completed successfully'
    });

  } catch (error) {
    console.error('❌ OCR Test Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'OCR test failed', 
      error: error.message 
    });
  }
});

// GET /api/test-ocr/config - Show current OCR configuration
router.get('/config', (req, res) => {
  try {
    const ocrVerifier = new PaymentVerificationOCR();
    
    return res.json({
      success: true,
      config: {
        expectedGCashNumber: ocrVerifier.EXPECTED_GCASH.number,
        expectedGCashName: ocrVerifier.EXPECTED_GCASH.name,
        merchantName: ocrVerifier.EXPECTED_GCASH.merchantName,
        minimumPayment: ocrVerifier.MINIMUM_PAYMENT,
        environment: {
          GCASH_NUMBER: process.env.GCASH_NUMBER,
          GCASH_ACCOUNT_NAME: process.env.GCASH_ACCOUNT_NAME,
          GCASH_MERCHANT_NAME: process.env.GCASH_MERCHANT_NAME
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get OCR config', 
      error: error.message 
    });
  }
});

module.exports = router;
