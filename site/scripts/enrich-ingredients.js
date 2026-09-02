import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ingredientsDir = path.join(root, 'src/content/ingredients');
const outDir = path.join(root, 'public/api/ingredients');

function walk(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(p));
    else if (e.name.endsWith('.md')) files.push(p);
  }
  return files;
}

const byId = {};
const byOrigin = {};

for (const file of walk(ingredientsDir)) {
  const raw = fs.readFileSync(file, 'utf-8');
  let data;
  try {
    data = matter(raw).data || {};
  } catch {
    continue;
  }
  const rel = path.relative(ingredientsDir, file).replace(/\.md$/, '');
  const slug = rel.split(path.sep).join('/');
  const id = slug.split('/').pop();
  const group = slug.split('/')[0] || 'otro';
  const name = data.name || id;
  const origin = data.origin || data.production_region || null;
  const variants = Array.isArray(data.variants) ? data.variants : [];

  byId[slug] = {
    id: slug,
    name,
    group,
    scientific_name: data.scientific_name || null,
    origin,
    production: data.production || null,
    variants,
    recommendations: data.recommendations || [],
    url: `/ingredients/${slug}`,
  };

  if (origin) {
    const key = typeof origin === 'string' ? origin : String(origin);
    (byOrigin[key] ||= []).push({ id: slug, name, group });
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'variants.json'),
  JSON.stringify({ generated_at: new Date().toISOString(), count: Object.keys(byId).length, ingredients: byId }, null, 2)
);
fs.writeFileSync(
  path.join(outDir, 'by-origin.json'),
  JSON.stringify({ generated_at: new Date().toISOString(), origins: Object.keys(byOrigin).length, by_origin: byOrigin }, null, 2)
);
console.log(`✅ ingredients API: ${Object.keys(byId).length} slugs, ${Object.keys(byOrigin).length} orígenes → public/api/ingredients/`);
