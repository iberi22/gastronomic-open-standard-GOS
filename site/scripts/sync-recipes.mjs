#!/usr/bin/env node
// site/scripts/sync-recipes.mjs — one-way sync dishes/ → site/src/content/dishes/
// Run: node scripts/sync-recipes.mjs [--dry-run]
// Safe: skips files that already exist and haven't changed.

import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');  // site/
const PROJ  = join(ROOT, '..');      // gastronomic-open-standard-GOS/
const DISHES_SRC  = join(PROJ, 'dishes');                // repo-root dishes/
const DISHES_DEST = join(ROOT, 'src', 'content', 'dishes'); // site/src/content/dishes/
const DRY = process.argv.includes('--dry-run');

const FRONTMATTER_FIELDS = ['title', 'region', 'categories', 'difficulty', 'prep_time', 'cook_time', 'servings', 'main_ingredients', 'tags'];

// Map directory name → region label (mirrors existing pattern)
const REGION_MAP = {
  american: 'Estados Unidos', argentinian: 'Argentina', brazilian: 'Brasil',
  chilean: 'Chile', china: 'China', colombian: 'Colombia', cuban: 'Cuba',
  dominican: 'República Dominicana', french: 'Francia', greek: 'Grecia',
  indian: 'India', italian: 'Italia', japanese: 'Japón', mexican: 'México',
  moroccan: 'Marruecos', peruvian: 'Perú', 'puerto-rican': 'Puerto Rico',
  spanish: 'España', thai: 'Tailandia',
};

// --- helpers ---
function hashFile(content) {
  return createHash('sha256').update(content.slice(0, 2048)).digest('hex').slice(0, 12);
}

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkDir(full);
    else if (entry.name.endsWith('.md')) yield full;
  }
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const [, yaml, content] = match;
  const data = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w[\w_]*):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { data, content };
}

function buildFrontmatter(data, region, categories, filePath) {
  // Build Astro-compatible frontmatter from existing data or infer
  const title = data.title || filePath.split('/').pop().replace(/_/g, ' ').replace(/-/g, ' ').split('.')[0];
  const titleCased = title.replace(/\b\w/g, c => c.toUpperCase());
  return `---\ntitle: "${titleCased}"\nregion: "${region}"\ncategories: [${(categories || []).map(c => `"${c}"`).join(', ')}]\n${data.difficulty ? `difficulty: "${data.difficulty}"\n` : ''}${data.prep_time ? `prep_time: "${data.prep_time}"\n` : ''}${data.cook_time ? `cook_time: "${data.cook_time}"\n` : ''}${data.servings ? `servings: "${data.servings}"\n` : ''}${data.tags ? `tags: [${data.tags.split(',').map(t => `"${t.trim()}"`).join(', ')}]\n` : ''}${data.main_ingredients ? `main_ingredients: [${data.main_ingredients.split(',').map(i => `"${i.trim()}"`).join(', ')}]\n` : ''}---\n`;
}

function regionFromPath(filePath) {
  const parts = filePath.split('/');
  for (const part of parts) {
    if (REGION_MAP[part]) return REGION_MAP[part];
  }
  return 'Internacional';
}

function categoryFromPath(filePath) {
  const parts = filePath.split('/');
  if (parts.length >= 3) {
    const dir = parts[parts.length - 2];
    // Use the parent directory name as category if it's not a region name
    if (!REGION_MAP[dir]) return dir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return null;
}

async function fileHash(file) {
  const raw = await readFile(file, 'utf-8');
  return hashFile(raw);
}

async function syncFile(srcFile, destFile) {
  const raw = await readFile(srcFile, 'utf-8');
  const { data } = parseFrontmatter(raw);
  const rel = relative(DISHES_SRC, srcFile);   // e.g. colombian/nacionales/arepas.md
  const region = REGION_MAP[rel.split('/')[0]] || regionFromPath(rel);
  const categories = data.categories
    ? (Array.isArray(data.categories) ? data.categories : [data.categories])
    : (categoryFromPath(rel) ? [categoryFromPath(rel)] : ['Plato']);

  const frontmatter = buildFrontmatter(data, region, categories, srcFile);
  const content = parseFrontmatter(raw).content;
  const newContent = frontmatter + content;

  if (DRY) {
    console.log(`  [DRY] WOULD COPY: ${rel} → ${relative(DISHES_DEST, destFile)}`);
    return 'dry';
  }
  await mkdir(dirname(destFile), { recursive: true });
  await writeFile(destFile, newContent, 'utf-8');
  return 'copied';
}

async function main() {
  console.log(`\nSync dishes/ → site/src/content/dishes/ ${DRY ? '(DRY RUN)' : '(LIVE)'}\n`);

  // Build manifest of destination files with their hashes
  const destHashes = new Map();
  for await (const file of walkDir(DISHES_DEST)) {
    try {
      const h = await fileHash(file);
      const rel = relative(DISHES_DEST, file);
      destHashes.set(rel, h);
    } catch { /* skip unreadable */ }
  }
  console.log(`  Dest manifest: ${destHashes.size} files\n`);

  let copied = 0, skipped = 0, errors = 0;

  for await (const srcFile of walkDir(DISHES_SRC)) {
    const rel = relative(DISHES_SRC, srcFile);   // e.g. colombian/nacionales/arepas.md
    const destFile = join(DISHES_DEST, rel);

    try {
      const srcHash = await fileHash(srcFile);
      const destHash = destHashes.get(rel);

      if (destHash && destHash === srcHash) {
        skipped++;
        continue;
      }

      const status = await syncFile(srcFile, destFile);
      if (status === 'copied') copied++;
      else if (status === 'dry') skipped++;
    } catch (err) {
      console.error(`  ERROR ${rel}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Done — copied: ${copied}, skipped: ${skipped}, errors: ${errors}`);
  if (DRY) console.log('  (re-run without --dry-run to apply)');
}

main().catch(console.error);
