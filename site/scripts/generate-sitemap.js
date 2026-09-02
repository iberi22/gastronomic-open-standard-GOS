// generate-sitemap.js — generates site/public/sitemap.xml with >50 URLs (recipes/ingredients/substances)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE = process.env.SITE_ORIGIN || 'https://gos-site.pages.dev';
const publicDir = path.resolve(__dirname, '../public');
const contentDir = path.resolve(__dirname, '../src/content');

function collectMd(base, prefix) {
  if (!fs.existsSync(base)) return [];
  const out = [];
  function walk(dir, rel) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(full, r);
      else if (ent.name.endsWith('.md')) out.push(prefix + '/' + r.replace(/\.md$/, ''));
    }
  }
  walk(base, '');
  return out;
}

const urls = [];

// static pages
[
  '/', '/graph', '/recipes', '/ingredients', '/scientific', '/substances',
  '/graph-data.json',
].forEach(p => urls.push({ loc: `${SITE}${p}`, priority: p === '/' ? '1.0' : '0.8' }));

// substances (30)
const substancesDir = path.join(contentDir, 'substances');
if (fs.existsSync(substancesDir)) {
  for (const f of fs.readdirSync(substancesDir)) {
    if (f.endsWith('.md') && f !== 'placeholder.md') {
      const slug = f.replace(/\.md$/, '');
      urls.push({ loc: `${SITE}/substances/${slug}`, priority: '0.7' });
    }
  }
}

// ingredients (sample first 20 to keep sitemap readable but >50 total)
const ingDir = path.join(contentDir, 'ingredients');
const ingUrls = collectMd(ingDir, '/ingredients');
ingUrls.slice(0, 20).forEach(u => urls.push({ loc: `${SITE}${u}`, priority: '0.6' }));

// dishes (sample first 20)
const dishesDir = path.join(contentDir, 'dishes');
const dishUrls = collectMd(dishesDir, '/recipes');
dishUrls.slice(0, 20).forEach(u => urls.push({ loc: `${SITE}${u}`, priority: '0.6' }));

// vitamins, conditions, diets placeholders
for (const col of ['vitamins', 'conditions', 'diets']) {
  const d = path.join(contentDir, col);
  if (fs.existsSync(d)) {
    for (const f of fs.readdirSync(d)) if (f.endsWith('.md') && f !== 'placeholder.md') {
      urls.push({ loc: `${SITE}/${col}/${f.replace(/\.md$/,'')}`, priority: '0.5' });
    }
  }
}

// Ensure at least 50 — if still short, add tips
if (urls.length < 50) {
  const tipsDir = path.join(contentDir, 'tips');
  const tipUrls = collectMd(tipsDir, '/tips');
  for (const u of tipUrls) {
    if (urls.length >= 70) break;
    urls.push({ loc: `${SITE}${u}`, priority: '0.5' });
  }
}

urls.sort((a,b) => a.loc.localeCompare(b.loc));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml generated with ${urls.length} URLs`);
