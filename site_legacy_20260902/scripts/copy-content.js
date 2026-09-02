import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the repo (parent of site/scripts)
const repoRoot = path.resolve(__dirname, '../../');
const dishesContentDir = path.resolve(__dirname, '../src/content/dishes');
const dishesPublicDir = path.resolve(__dirname, '../public/dishes');
const tipsContentDir = path.resolve(__dirname, '../src/content/tips');
const tipsPublicDir = path.resolve(__dirname, '../public/tips');
const dishesDir = path.join(repoRoot, 'dishes');
const tipsDir = path.join(repoRoot, 'tips');
const placeholderPath = path.join(repoRoot, 'dishes/colombian/nacionales/img/chorizo-2314640_640.jpg');
const baseUrl = '/gastronomic-open-standard-GOS';

// Clean existing directories
async function cleanDirs() {
  const dirs = [dishesContentDir, dishesPublicDir, tipsContentDir, tipsPublicDir];
  console.log('Cleaning existing directories...');
  for (const dir of dirs) {
    try {
      if (fs.existsSync(dir)) {
        await fsPromises.rm(dir, { recursive: true, force: true });
      }
      await fsPromises.mkdir(dir, { recursive: true });
    } catch (e) {
      console.warn(`Warning: Could not clear/create ${dir}:`, e.message);
    }
  }
}

// Optimization Configuration
const OPTIMIZE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
const MAX_WIDTH = 1200; // Good for mobile and desktop speed
const WEBP_QUALITY = 80;

async function processImage(srcPath, destPath, isLfs) {
  try {
    const ext = path.extname(srcPath).toLowerCase();

    // Determine source to read (original or placeholder if LFS)
    let sourceBuffer;
    if (isLfs) {
        if (fs.existsSync(placeholderPath)) {
             sourceBuffer = await fsPromises.readFile(placeholderPath);
        } else {
             // Fallback
             sourceBuffer = await fsPromises.readFile(srcPath);
        }
    } else {
        sourceBuffer = await fsPromises.readFile(srcPath);
    }

    // Check if the RESOLVED buffer is still an LFS pointer (e.g. placeholder itself is LFS)
    const prefix = sourceBuffer.toString('utf8', 0, 100);
    const resolvedIsLfs = prefix.startsWith('version https://git-lfs.github.com/spec/v1');

    // Check if we should optimize/convert
    // valid image + included extension
    if (OPTIMIZE_EXTENSIONS.includes(ext) && !resolvedIsLfs) {
        const destWebP = destPath.replace(/\.[^.]+$/, '.webp');

        try {
            await sharp(sourceBuffer)
                .resize(MAX_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
                .webp({ quality: WEBP_QUALITY })
                .toFile(destWebP);
        } catch (sharpError) {
             console.warn(`Sharp failed for ${srcPath}, falling back to copy. Error: ${sharpError.message}`);
             // Fallback: copy original to dest (keeping original ext? or force webp name?)
             // If we keep original ext, markdown rewrite will break.
             // Let's write the original content to the .webp path so the link works (even if browser fails to render)
             await fsPromises.writeFile(destWebP, sourceBuffer);
        }
    } else {
        // Just copy
        // For LFS pointers effectively acting as "images" (broken locally),
        // if markdown expects webp, we should probably output webp named file?
        // But if we simply return here, we fall through?
        // The original logic had an 'else' block

        if (OPTIMIZE_EXTENSIONS.includes(ext)) {
             // It was supposed to be optimized but we skipped it (LFS or other).
             // We MUST create the .webp file because markdown was rewritten.
             const destWebP = destPath.replace(/\.[^.]+$/, '.webp');
             await fsPromises.writeFile(destWebP, sourceBuffer);
        } else {
             await fsPromises.writeFile(destPath, sourceBuffer);
        }
    }
  } catch (e) {
    console.error(`Error processing image ${srcPath}:`, e.message);
    // Fallback copy
    await fsPromises.copyFile(srcPath, destPath);
  }
}

async function copyDir(src, destContent, destPublic, relativePath = '', urlSegment = 'dishes') {
  if (!fs.existsSync(src)) return;

  // Ensure dirs exist
  await fsPromises.mkdir(destContent, { recursive: true });
  await fsPromises.mkdir(destPublic, { recursive: true });

  const entries = await fsPromises.readdir(src, { withFileTypes: true });

  // Process concurrently
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destContentPath = path.join(destContent, entry.name);
    const destPublicPath = path.join(destPublic, entry.name);
    const newRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.name.toLowerCase() === 'china' || /[\u4e00-\u9fa5]/.test(entry.name)) {
      return;
    }

    if (entry.isDirectory()) {
      await copyDir(srcPath, destContentPath, destPublicPath, newRelativePath, urlSegment);
    } else if (entry.isFile()) {
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(entry.name);

      if (isImage) {
        // Check LFS
        const buffer = await fsPromises.readFile(srcPath);
        const prefix = buffer.toString('utf8', 0, 100);
        const isLfs = prefix.startsWith('version https://git-lfs.github.com/spec/v1');

        await processImage(srcPath, destPublicPath, isLfs);

      } else if (entry.name.endsWith('.md')) {
        // Copy markdown to src/content/ with updated image paths
        let content = await fsPromises.readFile(srcPath, 'utf8');

        // Replace relative image paths with absolute paths to /public
        content = content.replace(/\]\((?!http|https|\/|#)([^)]+)\)/g, (match, imgPath) => {
          try {
            if (imgPath.endsWith('.md')) return match;

            let cleanPath = imgPath.replace(/^\.\//, '');
            const ext = path.extname(cleanPath).toLowerCase();

            // If it's one of the optimized extensions, point to .webp
            if (OPTIMIZE_EXTENSIONS.includes(ext)) {
                cleanPath = cleanPath.replace(/\.[^.]+$/, '.webp');
            }

            // Build the public URL
            // Ensure we use the correct urlSegment (dishes vs tips)
            const publicUrl = `${baseUrl}/${urlSegment}/${newRelativePath.replace(entry.name, '')}${cleanPath}`.replace(/\/+/g, '/');

            // console.log(`  Rewriting: ${imgPath} -> ${publicUrl}`);
            return `](${publicUrl})`;
          } catch (e) {
            console.error(`Error rewriting path ${imgPath}:`, e);
            return match;
          }
        });

        await fsPromises.writeFile(destContentPath, content);
      }
    }
  }));
}

// Main execution
(async () => {
    try {
        await cleanDirs();

        console.log('Copying dishes to site content and public (with optimizations)...');
        if (fs.existsSync(dishesDir)) {
          const entries = await fsPromises.readdir(dishesDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.toLowerCase() === 'china' || /[\u4e00-\u9fa5]/.test(entry.name)) {
              continue;
            }
            const srcPath = path.join(dishesDir, entry.name);
            if (entry.isDirectory()) {
              console.log(`Processing ${entry.name}...`);
              // Pass 'dishes' as urlSegment
              await copyDir(srcPath, path.join(dishesContentDir, entry.name), path.join(dishesPublicDir, entry.name), entry.name, 'dishes');
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
               await fsPromises.copyFile(srcPath, path.join(dishesContentDir, entry.name));
            }
          }
        } else {
             console.error(`Dishes directory not found at ${dishesDir}`);
        }

        console.log('Copying tips to site content and public...');
        if (fs.existsSync(tipsDir)) {
           const entries = await fsPromises.readdir(tipsDir, { withFileTypes: true });
           for (const entry of entries) {
                if (entry.name.toLowerCase() === 'china' || /[\u4e00-\u9fa5]/.test(entry.name)) {
                  continue;
                }
                const srcPath = path.join(tipsDir, entry.name);
                if (entry.isDirectory()) {
                    console.log(`Processing ${entry.name}...`);
                    // Pass 'tips' as urlSegment
                    await copyDir(srcPath, path.join(tipsContentDir, entry.name), path.join(tipsPublicDir, entry.name), entry.name, 'tips');
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                   await fsPromises.copyFile(srcPath, path.join(tipsContentDir, entry.name));
                }
           }
        }

        console.log('Done.');

    } catch (e) {
        console.error("Build script failed:", e);
        process.exit(1);
    }
})();
