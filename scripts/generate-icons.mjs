import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve('public', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Navy palette colors
const bgDark = '#0b132b';
const cardDark = '#1c2541';
const accentTeal = '#38bdf8';
const textLight = '#f8fafc';

// SVG for standard icon
function getSvg(size, isMaskable = false) {
  // If maskable, safe zone is inner 80% (padding 10% on all sides)
  const pad = isMaskable ? size * 0.12 : size * 0.05;
  const contentSize = size - pad * 2;
  const radius = isMaskable ? 0 : size * 0.22;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${bgDark}" />
    <defs>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0284c7" flood-opacity="0.35" />
      </filter>
    </defs>

    <!-- Wallet / Card Container -->
    <rect x="${pad + contentSize * 0.1}" y="${pad + contentSize * 0.16}"
          width="${contentSize * 0.8}" height="${contentSize * 0.68}"
          rx="${contentSize * 0.14}" fill="url(#cardGrad)" stroke="#334155" stroke-width="${size * 0.015}" />
    
    <!-- Top flap / Accent bar -->
    <path d="M ${pad + contentSize * 0.1} ${pad + contentSize * 0.36} 
             H ${pad + contentSize * 0.9}" 
          stroke="${accentTeal}" stroke-width="${size * 0.012}" opacity="0.6" />

    <!-- Rupee symbol / Rs emblem in center -->
    <g transform="translate(${size / 2}, ${size / 2 + size * 0.03})">
      <circle r="${contentSize * 0.22}" fill="url(#accentGrad)" filter="url(#glow)" />
      <!-- Rs stylized text -->
      <text x="0" y="${size * 0.02}" 
            text-anchor="middle" dominant-baseline="middle" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-weight="900" font-size="${contentSize * 0.22}px" 
            fill="${textLight}">Rs</text>
    </g>
  </svg>
  `;
}

async function generate() {
  console.log('Generating PWA icons...');
  
  // 192x192
  const svg192 = Buffer.from(getSvg(192, false));
  await sharp(svg192).png().toFile(path.join(outputDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 512x512
  const svg512 = Buffer.from(getSvg(512, false));
  await sharp(svg512).png().toFile(path.join(outputDir, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // 512x512 maskable
  const svgMaskable = Buffer.from(getSvg(512, true));
  await sharp(svgMaskable).png().toFile(path.join(outputDir, 'icon-maskable-512.png'));
  console.log('Generated icon-maskable-512.png');

  // Also generate a favicon
  const svgFavicon = Buffer.from(getSvg(64, false));
  await sharp(svgFavicon).png().toFile(path.resolve('public', 'favicon.ico'));
  console.log('Generated favicon.ico');

  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
