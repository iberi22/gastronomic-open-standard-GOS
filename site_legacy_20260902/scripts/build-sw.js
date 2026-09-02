/**
 * GOS PWA - Service Worker Build Script
 * Compiles TypeScript service worker with Rollup + Workbox plugins
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SW_SRC = join(ROOT, 'src/workers/service-worker.ts');
const SW_OUT = join(ROOT, 'dist/service-worker.js');
const MANIFEST_OUT = join(ROOT, 'dist/manifest.json');

console.log('[GOS SW Build] Starting service worker build...');

// Ensure dist directory exists
mkdirSync(join(ROOT, 'dist'), { recursive: true });

// Step 1: Compile service worker with Rollup + TypeScript
console.log('[GOS SW Build] Compiling TypeScript...');
try {
  execSync(`npx rollup "${SW_SRC}" --format es --file "${SW_OUT}" --plugin node-resolve --plugin commonjs --plugin typescript`, {
    cwd: ROOT,
    stdio: 'inherit'
  });
  console.log('[GOS SW Build] Service worker compiled successfully');
} catch (error) {
  console.error('[GOS SW Build] Rollup compilation failed, trying direct tsc...');
  // Fallback: try a simpler approach
  execSync(`npx tsc "${SW_SRC}" --outDir dist --target es2020 --module es2020 --moduleResolution node --lib es2020 --skipLibCheck`, {
    cwd: ROOT,
    stdio: 'inherit'
  });
}

// Step 2: Inject Workbox precache manifest
console.log('[GOS SW Build] Injecting Workbox manifest...');
try {
  execSync(`npx workbox injectManifest rollup.config.js`, {
    cwd: ROOT,
    stdio: 'inherit'
  });
} catch {
  // If injectManifest fails, manually inject a basic manifest
  const manifest = {
    manifestVersion: 1,
    entries: []
  };
  writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2));
  console.log('[GOS SW Build] Basic manifest created');
}

// Step 3: Verify output
if (existsSync(SW_OUT)) {
  const content = readFileSync(SW_OUT, 'utf-8');
  const sizeKb = (content.length / 1024).toFixed(2);
  console.log(`[GOS SW Build] ✓ Service worker built: ${sizeKb}KB`);
} else {
  console.error('[GOS SW Build] ✗ Output file not found!');
  process.exit(1);
}

console.log('[GOS SW Build] Build complete!');
