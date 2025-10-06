// Create a simple test to see if we can use your logo
const fs = require('fs');

console.log('🔍 Checking icon files...');

// Check if LOGO.png exists and its size
try {
  const logoStats = fs.statSync('./assets/images/LOGO.png');
  console.log(`✅ LOGO.png exists: ${logoStats.size} bytes`);
  
  const iconStats = fs.statSync('./assets/images/icon.png');
  console.log(`✅ icon.png exists: ${iconStats.size} bytes`);
  
  const adaptiveStats = fs.statSync('./assets/images/adaptive-icon.png');
  console.log(`✅ adaptive-icon.png exists: ${adaptiveStats.size} bytes`);
  
  // Check if they're the same (meaning our copy worked)
  if (logoStats.size === iconStats.size && logoStats.size === adaptiveStats.size) {
    console.log('✅ All files are the same size - logo replacement worked!');
  } else {
    console.log('❌ Files are different sizes - replacement may have failed');
  }
  
} catch (error) {
  console.log('❌ Error checking files:', error.message);
}
