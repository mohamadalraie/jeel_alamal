const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const transparentPngPath = 'C:\\Users\\Administrator\\Desktop\\logo.png';
const outputIconsDir = path.join(__dirname, '../public/icons');
const outputPublicDir = path.join(__dirname, '../public');

if (!fs.existsSync(outputIconsDir)) {
  fs.mkdirSync(outputIconsDir, { recursive: true });
}

async function buildIcons() {
  if (!fs.existsSync(transparentPngPath)) {
    console.error('Source logo PNG not found at:', transparentPngPath);
    process.exit(1);
  }

  console.log('Processing transparent logo from:', transparentPngPath);

  // 1. Copy transparent logo directly to public/logo.png
  fs.copyFileSync(transparentPngPath, path.join(outputPublicDir, 'logo.png'));

  // 2. Generate PWA solid icons with #123b50 theme background
  const brandBg = { r: 18, g: 59, b: 80, alpha: 1 };

  // Standard icon 192x192
  const logo192 = await sharp(transparentPngPath)
    .resize(150, 150, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: { width: 192, height: 192, channels: 4, background: brandBg },
  })
    .composite([{ input: logo192, gravity: 'center' }])
    .png()
    .toFile(path.join(outputIconsDir, 'icon-192.png'));

  // Standard icon 512x512
  const logo512 = await sharp(transparentPngPath)
    .resize(400, 400, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: brandBg },
  })
    .composite([{ input: logo512, gravity: 'center' }])
    .png()
    .toFile(path.join(outputIconsDir, 'icon-512.png'));

  // Maskable icon 512x512 (75% safe area = ~370px)
  const logoMaskable = await sharp(transparentPngPath)
    .resize(370, 370, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: brandBg },
  })
    .composite([{ input: logoMaskable, gravity: 'center' }])
    .png()
    .toFile(path.join(outputIconsDir, 'maskable-icon-512.png'));

  // Apple Touch Icon 180x180
  const logoApple = await sharp(transparentPngPath)
    .resize(140, 140, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: { width: 180, height: 180, channels: 4, background: brandBg },
  })
    .composite([{ input: logoApple, gravity: 'center' }])
    .png()
    .toFile(path.join(outputIconsDir, 'apple-touch-icon.png'));

  // Favicon 64x64
  await sharp(transparentPngPath)
    .resize(64, 64, { fit: 'contain' })
    .png()
    .toFile(path.join(outputPublicDir, 'favicon.ico'));

  console.log('✅ Transparent logo and PWA icon assets generated successfully!');
}

buildIcons().catch(console.error);
