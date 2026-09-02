
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const LOGO_PATH = path.join(process.cwd(), 'public/images/logo.png');
const DISHES_DIR = path.join(process.cwd(), '../dishes');

async function applyWatermark() {
  console.log('🖼️  Iniciando proceso de marca de agua...');

  if (!fs.existsSync(LOGO_PATH)) {
    console.error('❌ Error: No se encuentra el logo en ' + LOGO_PATH);
    process.exit(1);
  }

  // Find all recipe images (jpg/jpeg/png) in dishes folder
  // Exclude 'images' subfolders to avoid re-watermarking processed ones if we run multiple times (though we overwrite so it mimics updating)
  // Actually, we want to watermark everything in dishes/**/images/*.jpg
  const images = await glob('../dishes/**/*.{jpg,jpeg,png}', { ignore: '**/node_modules/**' });

  console.log(`🔍 Encontradas ${images.length} imágenes para procesar.`);

  let processedCount = 0;
  let errorCount = 0;

  // Prepare Logo buffer once
  // Resize logo to be reasonable size (e.g., 100px width)
  const logoBuffer = await sharp(LOGO_PATH)
    .resize(100) // ancho del logo watermark
    .toBuffer();

  for (const imagePath of images) {
    // Skip if it is the logo itself or map assets
    if (imagePath.includes('logo.png') || imagePath.includes('cover_collage')) continue;

    try {
      const inputBuffer = fs.readFileSync(imagePath);
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) continue;

      // Calculate position: Bottom Right with padding
      // But we composite gravity south-east

      const buffer = await image
        .composite([
          {
            input: logoBuffer,
            gravity: 'southeast',
            blend: 'over',
             // padding handled by creating a transparent margin or just let it stick to corner?
             // Sharp 'gravity' puts it exactly at corner. Let's add a margin by extending the logo canvas or using top/left offsets.
             // Simpler: Use gravity southeast, but update logo to have padding?
             // Alternative: Don't resize logo up there, resize relative to image.
          }
        ])
        .jpeg({ quality: 90 }) // Normalize to JPEG 90%
        .toBuffer();

      fs.writeFileSync(imagePath, buffer);
      processedCount++;
      process.stdout.write(`\r✅ Procesadas: ${processedCount}/${images.length}`);
    } catch (err) {
      console.error(`\n❌ Error en ${imagePath}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n\n✨ Proceso completado.`);
  console.log(`✅ Éxito: ${processedCount}`);
  console.log(`❌ Errores: ${errorCount}`);
}

applyWatermark();
