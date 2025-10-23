#!/bin/bash
# OCR Dependencies Installation Script for Render

echo "🔧 Installing OCR dependencies for automatic payment verification..."

# Install tesseract.js and sharp
npm install tesseract.js@5.0.0 sharp@0.33.0

echo "✅ OCR dependencies installed successfully!"
echo "📊 Automatic payment verification is now enabled."

# Verify installation
echo "🔍 Verifying installation..."
node -e "
try {
  require('tesseract.js');
  require('sharp');
  console.log('✅ All OCR dependencies verified successfully!');
} catch (error) {
  console.error('❌ Installation verification failed:', error.message);
  process.exit(1);
}
"

echo "🚀 Ready for automatic GCash payment verification!"
