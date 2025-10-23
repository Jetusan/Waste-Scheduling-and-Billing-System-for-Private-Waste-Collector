// Test OCR functionality
const path = require('path');

async function testOCR() {
  try {
    console.log('🧪 Testing OCR functionality...');
    
    // Test if dependencies are available
    const Tesseract = require('tesseract.js');
    const sharp = require('sharp');
    console.log('✅ OCR dependencies loaded successfully');
    
    // Test PaymentVerificationOCR class
    const PaymentVerificationOCR = require('./utils/paymentOCR');
    const ocrVerifier = new PaymentVerificationOCR();
    console.log('✅ PaymentVerificationOCR class instantiated');
    
    console.log('🔧 OCR Configuration:');
    console.log('- Expected GCash Number:', ocrVerifier.EXPECTED_GCASH.number);
    console.log('- Expected Account Name:', ocrVerifier.EXPECTED_GCASH.name);
    console.log('- Minimum Payment:', `₱${ocrVerifier.MINIMUM_PAYMENT}`);
    
    console.log('🎉 OCR system is ready for automatic payment verification!');
    
  } catch (error) {
    console.error('❌ OCR Test Failed:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.log('\n📦 To fix this, run:');
      console.log('cd backend && npm install tesseract.js sharp');
    }
    
    process.exit(1);
  }
}

// Run test
testOCR();
