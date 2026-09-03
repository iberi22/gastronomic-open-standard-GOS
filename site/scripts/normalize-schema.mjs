#!/usr/bin/env node
// site/scripts/normalize-schema.mjs — Homogenize frontmatter across all dishes/
import { readFile, writeFile, readdir } from 'fs/promises';
import { join, dirname, relative, basename } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DISHES_DIR = join(ROOT, 'dishes');
const HTC_CACHE_DIR = join(ROOT, '.cache', 'HowToCook', 'dishes');

const siteRequire = createRequire(join(__dirname, '..', 'package.json'));
const matter = siteRequire('gray-matter');

const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_FILE = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1];

async function* walkDir(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) yield* walkDir(full);
      else if (entry.name.endsWith('.md')) yield full;
    }
  } catch {
    // Directory might not exist
  }
}

// Build map of HowToCook relative paths under dishes/
async function buildHowToCookMap() {
  const htcMap = new Map();
  for await (const file of walkDir(HTC_CACHE_DIR)) {
    const rel = relative(HTC_CACHE_DIR, file);
    const baseName = basename(file);
    htcMap.set(baseName, rel);
  }
  return htcMap;
}

function normalizeDifficulty(diff) {
  if (!diff) return '★★☆☆☆';
  diff = String(diff).trim().replace(/^["']|["']$/g, '');

  // Fix typo
  if (diff.includes('★竖☆☆☆')) return '★☆☆☆☆';

  // Count ★ and ☆
  const stars = (diff.match(/★/g) || []).length;
  const emptyStars = (diff.match(/☆/g) || []).length;
  if (stars >= 1 && stars <= 5 && (stars + emptyStars === 5)) {
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }
  if (stars >= 1 && stars <= 5) {
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }

  const dLower = diff.toLowerCase();
  if (dLower.includes('easy') || dLower.includes('baja') || dLower.includes('fácil') || dLower.includes('facil')) {
    if (dLower.includes('media')) return '★★☆☆☆';
    return '★☆☆☆☆';
  }
  if (dLower.includes('medium-hard') || dLower.includes('media-alta')) {
    return '★★★★☆';
  }
  if (dLower.includes('medium') || dLower.includes('media')) {
    return '★★★☆☆';
  }
  if (dLower.includes('hard') || dLower.includes('alta')) {
    return '★★★★☆';
  }

  return '★★☆☆☆';
}

function determineLanguage(filePath, existingLang) {
  if (existingLang && ['es', 'zh', 'pt', 'en'].includes(String(existingLang).toLowerCase())) {
    return String(existingLang).toLowerCase();
  }
  const rel = relative(DISHES_DIR, filePath);
  if (rel.startsWith('china/english') || rel.includes('/english/')) return 'en';
  if (rel.startsWith('china')) return 'zh';
  if (rel.startsWith('brazilian')) return 'pt';
  return 'es';
}

function normalizeSource(filePath, data, htcMap) {
  const rel = relative(DISHES_DIR, filePath);

  // 1. China collection (HowToCook)
  if (data.source_repo || rel.startsWith('china')) {
    const baseName = basename(filePath);
    const htcRel = htcMap.get(baseName);
    let htcUrl = 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/';
    if (htcRel) {
      htcUrl += htcRel;
    } else {
      // Fallback relative path construction
      const parts = rel.split('/');
      htcUrl += parts.slice(1).join('/');
    }

    return {
      name: 'Anduin2017/HowToCook',
      url: htcUrl,
      date_retrieved: '2026-09-03',
    };
  }

  // 2. Existing source object
  if (data.source && typeof data.source === 'object' && !Array.isArray(data.source)) {
    return {
      name: data.source.name || 'Gastronomic Open Standard (GOS) Database',
      url: data.source.url || 'pending',
      date_retrieved: data.source.date_retrieved || '2026-09-03',
      ...(data.source.notes ? { notes: data.source.notes } : {}),
    };
  }

  // 3. Existing sources array or string
  let rawSources = data.sources || data.source;
  if (typeof rawSources === 'string') rawSources = [rawSources];
  if (Array.isArray(rawSources) && rawSources.length > 0) {
    const urls = rawSources.filter(s => typeof s === 'string' && s.startsWith('http'));
    if (urls.length > 0) {
      const primaryUrl = urls[0];
      let name = 'Gastronomic Open Standard (GOS) Database';
      try {
        const u = new URL(primaryUrl);
        name = u.hostname.replace(/^www\./, '');
      } catch {}

      return {
        name,
        url: primaryUrl,
        date_retrieved: '2026-09-03',
      };
    }

    const nonUrl = rawSources.find(s => typeof s === 'string' && s.trim().length > 0);
    return {
      name: nonUrl || 'Gastronomic Open Standard (GOS) Database',
      url: 'pending',
      date_retrieved: '2026-09-03',
      notes: 'Derived from GOS Database',
    };
  }

  // 4. Fallback default
  return {
    name: 'Gastronomic Open Standard (GOS) Database',
    url: 'pending',
    date_retrieved: '2026-09-03',
  };
}

function processRecipe(filePath, rawContent, htcMap) {
  let parsed;
  try {
    parsed = matter(rawContent);
  } catch (err) {
    console.error(`[ERR] Matter parse error in ${filePath}: ${err.message}`);
    return null;
  }

  const data = parsed.data || {};

  // Transformations
  const lang = determineLanguage(filePath, data.language);
  const diff = normalizeDifficulty(data.difficulty);
  const sourceObj = normalizeSource(filePath, data, htcMap);

  // Construct normalized data structure preserving all existing keys
  const newData = { ...data };

  // Set required normalized keys
  newData.language = lang;
  newData.difficulty = diff;
  newData.source = sourceObj;
  newData.license = data.license || 'MIT';

  // Remove deprecated / migrated keys
  delete newData.source_repo;
  delete newData.sources;

  // Re-order frontmatter logically
  const orderedData = {};
  const priorityKeys = [
    'title', 'region', 'language', 'license', 'source',
    'category', 'categories', 'difficulty', 'prep_time',
    'cook_time', 'servings', 'tags', 'main_ingredients',
    'sensory', 'nutrition', 'images', 'image', 'description',
  ];

  priorityKeys.forEach(key => {
    if (key in newData) {
      orderedData[key] = newData[key];
    }
  });

  // Append any remaining custom keys
  Object.keys(newData).forEach(key => {
    if (!(key in orderedData)) {
      orderedData[key] = newData[key];
    }
  });

  // Ensure content starts with newline so stringify formatting is clean
  let bodyContent = parsed.content;
  if (!bodyContent.startsWith('\n')) {
    bodyContent = '\n' + bodyContent;
  }
  // Ensure trailing newline at end of file
  if (!bodyContent.endsWith('\n')) {
    bodyContent = bodyContent + '\n';
  }

  const newRawContent = matter.stringify(bodyContent, orderedData);
  return newRawContent;
}

async function main() {
  console.log(`\nNormalizing recipes frontmatter schema ${DRY_RUN ? '(DRY RUN)' : ''}...\n`);

  const htcMap = await buildHowToCookMap();
  console.log(`Loaded ${htcMap.size} HowToCook reference files.`);

  let processed = 0;
  let modified = 0;

  const filesToProcess = [];
  if (SINGLE_FILE) {
    filesToProcess.push(SINGLE_FILE);
  } else {
    for await (const file of walkDir(DISHES_DIR)) {
      filesToProcess.push(file);
    }
  }

  for (const file of filesToProcess) {
    processed++;
    const rawContent = await readFile(file, 'utf8');
    const newContent = processRecipe(file, rawContent, htcMap);

    if (newContent && newContent !== rawContent) {
      modified++;
      if (DRY_RUN) {
        console.log(`[DRY] Would update: ${relative(ROOT, file)}`);
      } else {
        await writeFile(file, newContent, 'utf8');
      }
    }
  }

  console.log(`\nDone! Processed: ${processed}, Modified: ${modified}`);
}

main().catch(console.error);
