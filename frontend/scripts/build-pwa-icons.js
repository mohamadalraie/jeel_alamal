const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outputDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 512x512 Damascene Gold & Navy PWA App Icon SVG Template
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid Brand Background (#123b50) -->
  <rect width="512" height="512" rx="100" fill="#123b50" />
  
  <!-- Subtle Damascene Lattice Background Pattern -->
  <g opacity="0.08" stroke="#ffffff" stroke-width="1.5" fill="none">
    <path d="M 256 0 L 512 256 L 256 512 L 0 256 Z" />
    <circle cx="256" cy="256" r="160" />
    <circle cx="256" cy="256" r="120" />
    <path d="M 0 0 L 512 512 M 512 0 L 0 512" />
  </g>

  <!-- Elegant Gold Ring Accent -->
  <circle cx="256" cy="256" r="230" fill="none" stroke="#e8c37d" stroke-width="6" opacity="0.6" />
  <circle cx="256" cy="256" r="222" fill="none" stroke="#e8c37d" stroke-width="2" opacity="0.4" />

  <!-- Inner Safe-Zone Centered Container (Scale 78% for perfect Maskable Icon padding) -->
  <g transform="translate(60, 60) scale(0.765)">
    <!-- Central Ornamental Crescent & Star motif -->
    <path d="M 256 60 Q 170 120 170 256 Q 170 392 256 452 Q 130 420 130 256 Q 130 92 256 60 Z" fill="#e8c37d" />
    
    <!-- Stylized Arabic Calligraphy / Text Badge "جيل العمل" -->
    <text x="260" y="240" font-family="'Amiri', 'Traditional Arabic', 'Segoe UI', sans-serif" font-size="76" font-weight="bold" fill="#ffffff" text-anchor="middle">
      جيل العمل
    </text>
    
    <text x="260" y="310" font-family="'Inter', 'Segoe UI', sans-serif" font-size="28" font-weight="600" fill="#e8c37d" text-anchor="middle" letter-spacing="3">
      JEEL ALAMAL
    </text>

    <!-- Small Gold Rosette Star -->
    <polygon points="256,340 262,355 278,355 265,365 270,380 256,370 242,380 247,365 234,355 250,355" fill="#e8c37d" />
  </g>
</svg>
`;

// Save base SVG
fs.writeFileSync(path.join(__dirname, '../public/icon.svg'), svgIcon);

async function generate() {
  const svgBuffer = Buffer.from(svgIcon);

  // 1. icon-192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));

  // 2. icon-512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));

  // 3. maskable-icon-512.png (squared rect for maskable purpose)
  const maskableSvg = svgIcon.replace('rx="100"', 'rx="0"');
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'maskable-icon-512.png'));

  // 4. apple-touch-icon.png
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));

  console.log('✅ PWA Icons successfully generated!');
}

generate().catch(console.error);
