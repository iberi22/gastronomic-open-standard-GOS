import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://iberi22.github.io/gastronomic-open-standard-GOS';

// Paths to collections
const siteDir = path.resolve(__dirname, '..');
const substancesDir = path.resolve(siteDir, 'src/content/substances');
const ingredientsDir = path.resolve(siteDir, 'src/content/ingredients');
const dishesDir = path.resolve(siteDir, 'src/content/dishes');
const publicSitemap = path.resolve(siteDir, 'public/sitemap.xml');

function getAllFiles(dirPath, ext = '.md') {
  if (!fs.existsSync(dirPath)) return [];
  let results = [];
  const list = fs.readdirSync(dirPath);
  for (const file of list) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

const mainPages = [
  '',
  'graph',
  'recipes',
  'ingredients',
  'scientific',
  'substances',
  'graph-data.json',
  'api/agent/knowledge.json'
];

let urls = mainPages.map(p => p === '' ? `${BASE_URL}/` : `${BASE_URL}/${p}`);

// Add substances
const subFiles = getAllFiles(substancesDir);
for (const f of subFiles) {
  const slug = path.basename(f, '.md');
  urls.push(`${BASE_URL}/substances/${slug}`);
}

// Add ingredients
const ingFiles = getAllFiles(ingredientsDir);
for (const f of ingFiles) {
  const rel = path.relative(ingredientsDir, f).replace(/\.md$/, '').replace(/\\/g, '/');
  urls.push(`${BASE_URL}/ingredients/${rel}`);
}

// Add dishes/recipes
const dishFiles = getAllFiles(dishesDir);
for (const f of dishFiles) {
  const rel = path.relative(dishesDir, f).replace(/\.md$/, '').replace(/\\/g, '/');
  urls.push(`${BASE_URL}/recipes/${rel}`);
}

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc><priority>${url.endsWith('/') ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`;

fs.writeFileSync(publicSitemap, sitemapXml, 'utf-8');
console.log(`Generated sitemap.xml with ${urls.length} URLs at ${publicSitemap}`);
