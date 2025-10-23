// Handle optional dependencies gracefully
let Tesseract, sharp;
try {
  Tesseract = require('tesseract.js');
  sharp = require('sharp');
} catch (error) {
  console.error('⚠️ OCR dependencies not found. Please install: npm install tesseract.js sharp');
  throw new Error('OCR dependencies missing. Run: npm install tesseract.js sharp');
}

const path = require('path');

class PaymentVerificationOCR {
  constructor() {
    // Expected GCash account details from environment variables
    this.EXPECTED_GCASH = {
      number: process.env.GCASH_NUMBER || '09916771885',
      partialNumber: '916 771 885', // Last part visible in receipts for 09916771885
      name: process.env.GCASH_ACCOUNT_NAME || 'Jytt Dela Pena',
      merchantName: process.env.GCASH_MERCHANT_NAME || 'WSBS- Waste Management'
    };
    
    // Minimum payment amount for full plan
    this.MINIMUM_PAYMENT = 199;
  }

  /**
   * Process payment proof image and extract key information
   */
  async verifyPaymentProof(imagePath, expectedAmount) {
    try {
      console.log('🔍 Starting payment verification for:', imagePath);
      
      // Preprocess image for better OCR
      const processedImagePath = await this.preprocessImage(imagePath);
      
      // Extract text from image
      const extractedText = await this.extractTextFromImage(processedImagePath);
      console.log('📄 Extracted text:', extractedText);
      
      // Parse payment details
      const paymentDetails = this.parsePaymentDetails(extractedText);
      console.log('💰 Parsed payment details:', paymentDetails);
      
      // Verify payment authenticity
      const verification = this.verifyPaymentDetails(paymentDetails, expectedAmount);
      
      return {
        success: true,
        extractedText,
        paymentDetails,
        verification,
        isValid: verification.isValid,
        confidence: verification.confidence
      };
      
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      return {
        success: false,
        error: error.message,
        isValid: false,
        confidence: 0
      };
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(path.extname(imagePath), '_processed.png');
      
      await sharp(imagePath)
        .resize(1200, null, { withoutEnlargement: true })
        .greyscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(outputPath);
        
      return outputPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  async extractTextFromImage(imagePath) {
    try {
      const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => console.log('OCR Progress:', m)
      });
      
      return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Parse payment details from extracted text
   */
  parsePaymentDetails(text) {
    const details = {
      recipient: null,
      recipientNumber: null,
      amount: null,
      totalAmount: null,
      referenceNumber: null,
      date: null,
      time: null
    };

    // Extract recipient name (JU••Y M.)
    const recipientMatch = text.match(/JU[•*]{2}Y\s+M\./i);
    if (recipientMatch) {
      details.recipient = recipientMatch[0];
    }

    // Extract phone number - looking for 09916771885 or +63 916 771 885
    const phoneMatch = text.match(/(?:\+?63\s*|0)9\d{2}\s*\d{3}\s*\d{3,4}/);
    if (phoneMatch) {
      details.recipientNumber = phoneMatch[0].replace(/\s+/g, '').replace(/^\+?63/, '0');
    }

    // Extract amount (₱1.00, £1.00, or standalone 1.00) - Handle OCR misreading ₱ as £
    const amountMatches = text.match(/(?:₱|£|PHP|P)\s*(\d+(?:\.\d{2})?)/gi);
    const standaloneAmounts = text.match(/\b\d{2,3}\.\d{2}\b/g);
    
    if (amountMatches && amountMatches.length > 0) {
      // Get the first amount (usually the main amount)
      const amountStr = amountMatches[0].replace(/[₱£PHP\s]/gi, '');
      details.amount = parseFloat(amountStr);
      
      // If there are multiple amounts, the second might be total
      if (amountMatches.length > 1) {
        const totalStr = amountMatches[1].replace(/[₱£PHP\s]/gi, '');
        details.totalAmount = parseFloat(totalStr);
      }
    } else if (standaloneAmounts && standaloneAmounts.length > 0) {
      // Fallback: use standalone amounts like "200.00"
      details.amount = parseFloat(standaloneAmounts[0]);
      if (standaloneAmounts.length > 1) {
        details.totalAmount = parseFloat(standaloneAmounts[1]);
      }
    }

    // Extract reference number (9033 942 304277)
    const refMatch = text.match(/(?:Ref\.?\s*No\.?\s*|Reference\s*:?\s*)(\d{4}\s*\d{3}\s*\d{6})/i);
    if (refMatch) {
      details.referenceNumber = refMatch[1].replace(/\s+/g, '');
    }

    // Extract date (Oct 23, 2025)
    const dateMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i);
    if (dateMatch) {
      details.date = dateMatch[0];
    }

    // Extract time (9:46 PM)
    const timeMatch = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
    if (timeMatch) {
      details.time = timeMatch[0];
    }

    return details;
  }

  /**
   * Verify payment details against expected values
   */
  verifyPaymentDetails(details, expectedAmount) {
    const verification = {
      isValid: false,
      confidence: 0,
      checks: {
        correctGCashNumber: false,
        minimumAmount: false,
        exactAmountMatch: false,
        hasReference: false,
        hasDate: false
      },
      issues: []
    };

    console.log('🔍 Verifying payment details:', {
      expectedGCash: this.EXPECTED_GCASH.number,
      foundNumber: details.recipientNumber,
      expectedAmount: expectedAmount,
      foundAmount: details.amount,
      minimumRequired: this.MINIMUM_PAYMENT
    });

    // CRITICAL: Check if payment was sent to correct GCash number
    if (details.recipientNumber === this.EXPECTED_GCASH.number) {
      verification.checks.correctGCashNumber = true;
      console.log('✅ Correct GCash number verified');
    } else {
      verification.issues.push(`Payment sent to wrong GCash number. Expected: ${this.EXPECTED_GCASH.number}, Found: ${details.recipientNumber || 'N/A'}`);
      console.log('❌ Wrong GCash number detected');
    }

    // Check if amount meets minimum requirement (₱199 for full plan) with tolerance
    const foundAmount = details.amount || details.totalAmount || 0;
    const expectedAmountFloat = parseFloat(expectedAmount);
    
    // Accept if amount is within ₱5 tolerance of expected amount OR meets minimum requirement
    const meetsMinimum = foundAmount >= this.MINIMUM_PAYMENT;
    const withinTolerance = foundAmount > 0 && Math.abs(foundAmount - expectedAmountFloat) <= 5;
    
    if (meetsMinimum || withinTolerance) {
      verification.checks.minimumAmount = true;
      console.log(`✅ Payment amount accepted: ₱${foundAmount} (expected: ₱${expectedAmount})`);
    } else {
      verification.issues.push(`Payment amount too low. Minimum required: ₱${this.MINIMUM_PAYMENT}, Found: ₱${foundAmount}`);
      console.log('❌ Payment below minimum amount');
    }

    // Check if amount matches expected exactly (use existing expectedAmountFloat variable)
    if (foundAmount && Math.abs(foundAmount - expectedAmountFloat) <= 5) {
      verification.checks.exactAmountMatch = true;
      console.log('✅ Exact amount match verified');
    } else {
      verification.issues.push(`Amount mismatch. Expected: ₱${expectedAmount}, Found: ₱${foundAmount}`);
      console.log('⚠️ Amount does not match exactly');
    }

    // Check reference number
    if (details.referenceNumber && details.referenceNumber.length >= 10) {
      verification.checks.hasReference = true;
      console.log('✅ Reference number found');
    } else {
      verification.issues.push('Reference number not found or too short');
      console.log('⚠️ No valid reference number');
    }

    // Check date
    if (details.date) {
      verification.checks.hasDate = true;
      console.log('✅ Transaction date found');
    } else {
      verification.issues.push('Transaction date not found');
      console.log('⚠️ No transaction date found');
    }

    // Calculate confidence score
    const checksPassed = Object.values(verification.checks).filter(Boolean).length;
    verification.confidence = (checksPassed / Object.keys(verification.checks).length) * 100;

    // STRICT VALIDATION: Payment is only valid if:
    // 1. Sent to correct GCash number (CRITICAL)
    // 2. Meets minimum amount requirement (CRITICAL)
    // 3. Has reference number (for tracking)
    verification.isValid = verification.checks.correctGCashNumber && 
                          verification.checks.minimumAmount && 
                          verification.checks.hasReference;

    console.log('📊 Final verification result:', {
      isValid: verification.isValid,
      confidence: verification.confidence,
      criticalChecks: {
        correctGCash: verification.checks.correctGCashNumber,
        minimumAmount: verification.checks.minimumAmount,
        hasReference: verification.checks.hasReference
      }
    });

    return verification;
  }

  /**
   * Generate verification report
   */
  generateVerificationReport(verificationResult) {
    const { paymentDetails, verification } = verificationResult;
    
    let report = '📊 PAYMENT VERIFICATION REPORT\n';
    report += '═══════════════════════════════════\n\n';
    
    report += '💰 PAYMENT DETAILS:\n';
    report += `• Recipient: ${paymentDetails.recipient || 'Not found'}\n`;
    report += `• Phone: ${paymentDetails.recipientNumber || 'Not found'}\n`;
    report += `• Amount: ₱${paymentDetails.amount || 'Not found'}\n`;
    report += `• Reference: ${paymentDetails.referenceNumber || 'Not found'}\n`;
    report += `• Date: ${paymentDetails.date || 'Not found'} ${paymentDetails.time || ''}\n\n`;
    
    report += '✅ VERIFICATION CHECKS:\n';
    report += `• Correct GCash Number (${this.EXPECTED_GCASH.number}): ${verification.checks.correctGCashNumber ? '✓' : '✗'}\n`;
    report += `• Minimum Amount (₱${this.MINIMUM_PAYMENT}+): ${verification.checks.minimumAmount ? '✓' : '✗'}\n`;
    report += `• Exact Amount Match: ${verification.checks.exactAmountMatch ? '✓' : '✗'}\n`;
    report += `• Has Reference Number: ${verification.checks.hasReference ? '✓' : '✗'}\n`;
    report += `• Has Transaction Date: ${verification.checks.hasDate ? '✓' : '✗'}\n\n`;
    
    report += `🎯 CONFIDENCE SCORE: ${verification.confidence.toFixed(1)}%\n`;
    report += `📋 FINAL RESULT: ${verification.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;
    
    if (verification.issues.length > 0) {
      report += '⚠️ ISSUES FOUND:\n';
      verification.issues.forEach(issue => {
        report += `• ${issue}\n`;
      });
    }
    
    return report;
  }
}

module.exports = PaymentVerificationOCR;
