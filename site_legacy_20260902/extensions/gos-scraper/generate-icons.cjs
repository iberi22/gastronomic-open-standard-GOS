const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname);

// Simple icon SVG
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 SIZE SIZE">
  <rect width="SIZE" height="SIZE" rx="SIZE/4" fill="#e94560"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="SIZE*0.6" fill="white">🍽</text>
</svg>`.replace(/SIZE/g, 'SIZE');

const sizes = [
  { name: 'icon16.png', size: 16 },
  { name: 'icon48.png', size: 48 },
  { name: 'icon128.png', size: 128 },
];

async function generateIcons() {
  console.log('Generating icons...');
  
  for (const { name, size } of sizes) {
    const svg = iconSvg.replace(/SIZE/g, size.toString());
    const outputPath = path.join(iconsDir, name);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: ${name} (${size}x${size})`);
  }
  
  console.log('Done!');
}

generateIcons().catch(console.error);