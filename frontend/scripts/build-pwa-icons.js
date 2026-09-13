const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceLogoPath = 'C:\\Users\\Administrator\\Desktop\\logo.jpg';
const outputIconsDir = path.join(__dirname, '../public/icons');
const outputPublicDir = path.join(__dirname, '../public');

if (!fs.existsSync(outputIconsDir)) {
  fs.mkdirSync(outputIconsDir, { recursive: true });
}

async function buildIcons() {
  if (!fs.existsSync(sourceLogoPath)) {
    console.error('Source logo file not found at:', sourceLogoPath);
    process.exit(1);
  }

  console.log('Processing custom logo from:', sourceLogoPath);

  // 1. Generate public/logo.png
  await sharp(sourceLogoPath)
    .png()
    .toFile(path.join(outputPublicDir, 'logo.png'));

  // 2. Generate public/icons/icon-192.png (192x192)
  await sharp(sourceLogoPath)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(outputIconsDir, 'icon-192.png'));

  // 3. Generate public/icons/icon-512.png (512x512)
  await sharp(sourceLogoPath)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(outputIconsDir, 'icon-512.png'));

  // 4. Generate public/icons/maskable-icon-512.png (Safe-padded for Android OS adaptive masks)
  // Get dominant corner color or use #0b3846 background
  const logoResized = await sharp(sourceLogoPath)
    .resize(410, 410, { fit: 'contain', background: { r: 11, g: 56, b: 70, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 56, b: 70, alpha: 1 },
    },
  })
    .composite([{ input: logoResized, gravity: 'center' }])
    .png()
    .toFile(path.join(outputIconsDir, 'maskable-icon-512.png'));

  // 5. Generate public/icons/apple-touch-icon.png (180x180)
  await sharp(sourceLogoPath)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(outputIconsDir, 'apple-touch-icon.png'));

  // 6. Generate public/favicon.ico (64x64 PNG)
  await sharp(sourceLogoPath)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(outputPublicDir, 'favicon.ico'));

  console.log('✅ Custom logo and all PWA icon assets generated successfully!');
}

buildIcons().catch(console.error);
