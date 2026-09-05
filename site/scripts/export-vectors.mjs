import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

const sitePublicVectorsDir = path.join(__dirname, '../public/api/vectors');

const ingredientsDirs = [
  path.join(__dirname, '../src/content/ingredients'),
  path.join(repoRoot, 'ingredients')
];

const dishesDirs = [
  path.join(__dirname, '../src/content/dishes'),
  path.join(repoRoot, 'dishes')
];

const substancesDirs = [
  path.join(__dirname, '../src/content/substances'),
  path.join(repoRoot, 'substances')
];

// Spanish-to-English translation mapping for common ingredient terms to ensure high semantic cross-lingual matching
const SPANISH_ENGLISH_MAP = {
  'ajo': 'garlic',
  'cebolla': 'onion',
  'tomate': 'tomato',
  'papa': 'potato',
  'papas': 'potatoes',
  'arroz': 'rice',
  'maiz': 'corn',
  'frijol': 'beans',
  'frijoles': 'beans',
  'carne': 'meat / beef',
  'pollo': 'chicken',
  'pescado': 'fish',
  'zanahoria': 'carrot',
  'aguacate': 'avocado',
  'limon': 'lime / lemon',
  'cilantro': 'coriander / cilantro',
  'comino': 'cumin',
  'jengibre': 'ginger',
  'sal': 'salt',
  'pimienta': 'black pepper',
  'leche': 'milk',
  'queso': 'cheese',
  'mantequilla': 'butter',
  'panela': 'panela / unrefined cane sugar',
  'yuca': 'cassava / yuca',
  'platano': 'plantain',
  'aceite': 'cooking oil',
  'almidon': 'starch',
  'harina': 'flour'
};

function getTranslation(name) {
  if (!name) return '';
  const key = name.toLowerCase().trim();
  return SPANISH_ENGLISH_MAP[key] || '';
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return (normA && normB) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      results.push(fullPath);
    }
  }
  return results;
}

function cleanText(markdown) {
  if (!markdown) return '';
  return markdown
    .replace(/#+\s+/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~>|\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findFirstExistingDir(dirList) {
  for (const d of dirList) {
    if (fs.existsSync(d) && fs.readdirSync(d).length > 0) return d;
  }
  return dirList[0];
}

// Scanners
function scanIngredientsCollection() {
  const targetDir = findFirstExistingDir(ingredientsDirs);
  const files = walkDir(targetDir);
  const items = [];
  const seenIds = new Set();

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      const rel = path.relative(targetDir, file).replace(/\\/g, '/').replace(/\.md$/, '');
      const id = rel;

      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const name = data.name || path.basename(file, '.md');
      const translation = getTranslation(name);
      const sciName = data.scientific_name || '';
      const group = data.group || '';

      const activeComp = Array.isArray(data.active_compounds)
        ? data.active_compounds.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean).join(', ')
        : '';

      const healthConds = Array.isArray(data.health_registry)
        ? data.health_registry.map(h => h.condition || h.name || '').filter(Boolean).join(', ')
        : '';

      const tags = Array.isArray(data.tags) ? data.tags.join(', ') : '';
      const bodySnippet = cleanText(content).slice(0, 300);

      const parts = [
        name,
        translation ? `(${translation})` : '',
        sciName ? `- ${sciName}` : '',
        group ? `Group: ${group}` : '',
        activeComp ? `Active compounds: ${activeComp}` : '',
        healthConds ? `Health conditions: ${healthConds}` : '',
        tags ? `Tags: ${tags}` : '',
        bodySnippet
      ].filter(Boolean);

      items.push({
        id,
        type: 'ingredient',
        text: parts.join('. ')
      });
    } catch (err) {
      console.warn(`[export-vectors] Error parsing ingredient ${file}:`, err.message);
    }
  }

  return items;
}

function scanDishesCollection() {
  const targetDir = findFirstExistingDir(dishesDirs);
  const files = walkDir(targetDir);
  const items = [];
  const seenIds = new Set();

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      const rel = path.relative(targetDir, file).replace(/\\/g, '/').replace(/\.md$/, '');
      const id = rel;

      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const title = data.title || path.basename(file, '.md');
      const region = data.region || '';
      const categories = Array.isArray(data.categories) ? data.categories.join(', ') : (data.category || '');
      const mainIngs = Array.isArray(data.main_ingredients) ? data.main_ingredients.join(', ') : '';

      const sensory = data.sensory || {};
      const sensoryParts = [
        ...(Array.isArray(sensory.flavor) ? sensory.flavor : []),
        ...(Array.isArray(sensory.texture) ? sensory.texture : []),
        ...(Array.isArray(sensory.aroma) ? sensory.aroma : [])
      ].join(', ');

      const tags = Array.isArray(data.tags) ? data.tags.join(', ') : '';
      const bodySnippet = cleanText(content).slice(0, 300);

      const parts = [
        title,
        region ? `Region: ${region}` : '',
        categories ? `Categories: ${categories}` : '',
        mainIngs ? `Ingredients: ${mainIngs}` : '',
        sensoryParts ? `Sensory profile: ${sensoryParts}` : '',
        tags ? `Tags: ${tags}` : '',
        bodySnippet
      ].filter(Boolean);

      items.push({
        id,
        type: 'dish',
        text: parts.join('. ')
      });
    } catch (err) {
      console.warn(`[export-vectors] Error parsing dish ${file}:`, err.message);
    }
  }

  return items;
}

function scanSubstancesCollection() {
  const targetDir = findFirstExistingDir(substancesDirs);
  const files = walkDir(targetDir);
  const items = [];
  const seenIds = new Set();

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      const rel = path.relative(targetDir, file).replace(/\\/g, '/').replace(/\.md$/, '');
      const id = rel;

      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const name = data.name || path.basename(file, '.md');
      const formula = data.formula || '';
      const sourceIng = data.source_ingredient || '';
      const benefit = data.benefit || '';
      const sazon = data.sazon || '';
      const sabor = data.sabor || '';

      const healthConds = Array.isArray(data.health_registry)
        ? data.health_registry.map(h => h.condition || h.name || '').filter(Boolean).join(', ')
        : '';

      const tags = Array.isArray(data.tags) ? data.tags.join(', ') : '';
      const bodySnippet = cleanText(content).slice(0, 300);

      const parts = [
        name,
        formula ? `(${formula})` : '',
        sourceIng ? `Source: ${sourceIng}` : '',
        benefit ? `Benefit: ${benefit}` : '',
        sazon ? `Sazon: ${sazon}` : '',
        sabor ? `Flavor: ${sabor}` : '',
        healthConds ? `Conditions: ${healthConds}` : '',
        tags ? `Tags: ${tags}` : '',
        bodySnippet
      ].filter(Boolean);

      items.push({
        id,
        type: 'substance',
        text: parts.join('. ')
      });
    } catch (err) {
      console.warn(`[export-vectors] Error parsing substance ${file}:`, err.message);
    }
  }

  return items;
}

// Pluggable Providers
class LocalTransformersProvider {
  constructor(modelName = 'Xenova/all-MiniLM-L6-v2') {
    this.name = modelName;
    this.dim = 384;
    this.extractor = null;
  }

  async init() {
    console.log(`[export-vectors] Loading local model: ${this.name}...`);
    const { pipeline } = await import('@xenova/transformers');
    this.extractor = await pipeline('feature-extraction', this.name);
    console.log(`[export-vectors] Model loaded successfully.`);
  }

  async embedBatch(texts) {
    const out = await this.extractor(texts, { pooling: 'mean', normalize: true });
    // out is Tensor, out.data is Float32Array
    const data = out.data;
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      const slice = data.subarray(i * this.dim, (i + 1) * this.dim);
      results.push(Array.from(slice));
    }
    return results;
  }
}

class WorkersAIProvider {
  constructor(modelName = '@cf/baai/bge-large-en-v1.5', accountId = process.env.CF_ACCOUNT_ID, apiToken = process.env.CLOUDFLARE_API_TOKEN) {
    this.name = modelName;
    this.dim = 1024;
    this.accountId = accountId;
    this.apiToken = apiToken;
  }

  async init() {
    if (!this.accountId || !this.apiToken) {
      throw new Error('Workers AI requires CF_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
    }
    console.log(`[export-vectors] Configured Cloudflare Workers AI provider: ${this.name}`);
  }

  async embedBatch(texts) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.name}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: texts })
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(`Workers AI error: ${JSON.stringify(json.errors)}`);
    }
    return json.result.data;
  }
}

async function getProvider() {
  const providerType = process.env.EMBEDDING_PROVIDER || 'local';
  if (providerType === 'workers-ai' || process.argv.includes('--workers-ai')) {
    try {
      const provider = new WorkersAIProvider();
      await provider.init();
      return provider;
    } catch (err) {
      console.warn(`[export-vectors] Workers AI initialization failed (${err.message}). Falling back to local transformers provider.`);
    }
  }

  const provider = new LocalTransformersProvider();
  await provider.init();
  return provider;
}

export async function exportVectors() {
  console.log('🚀 Starting GOS Vector Embeddings Snapshot Export...');

  console.log('📦 Scanning collections...');
  const ingredients = scanIngredientsCollection();
  const dishes = scanDishesCollection();
  const substances = scanSubstancesCollection();

  console.log(`   - Ingredients: ${ingredients.length}`);
  console.log(`   - Dishes: ${dishes.length}`);
  console.log(`   - Substances: ${substances.length}`);

  const allItems = [...ingredients, ...dishes, ...substances];
  const totalCount = allItems.length;
  console.log(`   Total items to embed: ${totalCount}`);

  const provider = await getProvider();

  console.log('🧠 Generating embeddings in batches...');
  const batchSize = 32;
  const vectors = [];

  for (let i = 0; i < allItems.length; i += batchSize) {
    const batch = allItems.slice(i, i + batchSize);
    const texts = batch.map(item => item.text);
    const embeddings = await provider.embedBatch(texts);

    for (let j = 0; j < batch.length; j++) {
      vectors.push({
        id: batch[j].id,
        type: batch[j].type,
        text: batch[j].text,
        embedding: embeddings[j]
      });
    }

    if ((i + batchSize) % 128 === 0 || i + batchSize >= allItems.length) {
      console.log(`   Processed ${Math.min(i + batchSize, allItems.length)} / ${totalCount} items`);
    }
  }

  // Spot-check Cosine Similarity for 'ajo' vs 'garlic'
  const ajoItem = vectors.find(v => v.type === 'ingredient' && (v.id.endsWith('/ajo') || v.id === 'ajo' || v.id.includes('condiments/ajo')));
  if (ajoItem) {
    const [garlicEmbedding] = await provider.embedBatch(['Garlic (ajo) - Allium sativum. Group: Condiment. Bioactivo: alicina']);
    const sim = cosineSimilarity(ajoItem.embedding, garlicEmbedding);
    console.log(`🎯 Spot-check Cosine Similarity [ajo vs garlic]: ${sim.toFixed(4)}`);
    if (sim < 0.8) {
      throw new Error(`Spot-check failed: cosine similarity ${sim.toFixed(4)} < 0.8`);
    } else {
      console.log(`✅ Spot-check passed (> 0.8)`);
    }
  }

  // Output Sharding
  if (fs.existsSync(sitePublicVectorsDir)) {
    fs.rmSync(sitePublicVectorsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(sitePublicVectorsDir, { recursive: true });

  const maxItemsPerShard = 500;
  const shards = [];

  for (let i = 0; i < vectors.length; i += maxItemsPerShard) {
    const shardItems = vectors.slice(i, i + maxItemsPerShard);
    const shardFileName = `vectors-${shards.length + 1}.json`;
    const shardFilePath = path.join(sitePublicVectorsDir, shardFileName);

    const jsonContent = JSON.stringify(shardItems, null, 2);
    fs.writeFileSync(shardFilePath, jsonContent + '\n', 'utf8');

    const stats = fs.statSync(shardFilePath);
    shards.push({
      file: shardFileName,
      count: shardItems.length,
      size_bytes: stats.size
    });

    console.log(`   ✓ Written ${shardFileName} (${shardItems.length} vectors, ${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  const manifest = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    model: provider.name,
    dim: provider.dim,
    count: {
      total: totalCount,
      ingredients: ingredients.length,
      dishes: dishes.length,
      substances: substances.length
    },
    shards: shards
  };

  const manifestPath = path.join(sitePublicVectorsDir, 'index.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`   ✓ Written manifest index.json`);

  console.log('✅ GOS Vector Embeddings Snapshot Export Complete!');
}

// Run if directly executed
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  exportVectors().catch(err => {
    console.error('❌ Vector Export Failed:', err);
    process.exit(1);
  });
}
