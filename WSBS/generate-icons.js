// Script to copy LOGO.png to all Android mipmap folders
const fs = require('fs');
const path = require('path');

const logoPath = './assets/images/LOGO.png';
const mipmapFolders = [
  './android/app/src/main/res/mipmap-hdpi',
  './android/app/src/main/res/mipmap-mdpi', 
  './android/app/src/main/res/mipmap-xhdpi',
  './android/app/src/main/res/mipmap-xxhdpi',
  './android/app/src/main/res/mipmap-xxxhdpi'
];

console.log('🎨 Generating Android icons from LOGO.png...');

mipmapFolders.forEach(folder => {
  try {
    // Copy LOGO.png as ic_launcher.png (replacing the .webp file)
    const targetPath = path.join(folder, 'ic_launcher.png');
    fs.copyFileSync(logoPath, targetPath);
    console.log(`✅ Created: ${targetPath}`);
    
    // Also copy as ic_launcher_round.png
    const roundPath = path.join(folder, 'ic_launcher_round.png');
    fs.copyFileSync(logoPath, roundPath);
    console.log(`✅ Created: ${roundPath}`);
    
  } catch (error) {
    console.log(`❌ Error with ${folder}:`, error.message);
  }
});

console.log('🎉 Icon generation complete!');
