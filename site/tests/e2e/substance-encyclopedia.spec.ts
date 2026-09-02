import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('Enciclopedia de substancias tiene 30 archivos md con formula y sazon', async () => {
  const dir = path.resolve('src/content/substances');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  expect(files.length).toBe(30);

  const alicina = fs.readFileSync(path.join(dir, 'alicina.md'), 'utf8');
  expect(alicina).toContain('formula:');
  expect(alicina).toContain('sazon:');
  expect(alicina).toContain('vitaminas:');
  expect(alicina).toContain('health_registry:');
});

test('Componentes y paginas de substancias existen', async () => {
  expect(fs.existsSync(path.resolve('src/components/SubstanceCard.svelte'))).toBeTruthy();
  expect(fs.existsSync(path.resolve('src/pages/substances/index.astro'))).toBeTruthy();
  expect(fs.existsSync(path.resolve('src/pages/substances/[...slug].astro'))).toBeTruthy();

  const indexPage = fs.readFileSync(path.resolve('src/pages/substances/index.astro'), 'utf8');
  expect(indexPage).toContain("getCollection('substances')");
});

test('SEO JSON-LD helpers y bot files existen y estan configurados', async () => {
  const seo = fs.readFileSync(path.resolve('src/lib/seo.ts'), 'utf8');
  expect(seo).toContain('recipeJsonLd');
  expect(seo).toContain('ingredientJsonLd');
  expect(seo).toContain('substanceJsonLd');

  const robots = fs.readFileSync(path.resolve('public/robots.txt'), 'utf8');
  expect(robots).toContain('Sitemap');

  const llms = fs.readFileSync(path.resolve('public/llms.txt'), 'utf8');
  expect(llms).toContain('gos');

  const sitemap = fs.readFileSync(path.resolve('public/sitemap.xml'), 'utf8');
  const urlMatches = sitemap.match(/<url>/g);
  expect(urlMatches && urlMatches.length >= 50).toBeTruthy();
});

test('Endpoints de Paywall para Agentes existen y usan billing.ts', async () => {
  expect(fs.existsSync(path.resolve('src/pages/api/agent/knowledge.json.ts'))).toBeTruthy();
  expect(fs.existsSync(path.resolve('src/pages/api/agent/pay.ts'))).toBeTruthy();

  const payApi = fs.readFileSync(path.resolve('src/pages/api/agent/pay.ts'), 'utf8');
  expect(payApi).toContain('billing');
  expect(payApi).toContain('402');
});
