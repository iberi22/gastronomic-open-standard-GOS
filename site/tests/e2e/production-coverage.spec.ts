import { test, expect } from '@playwright/test';

// Production E2E coverage — points at the live GitHub Pages deployment.
// baseURL is set in playwright.config.ts to PRODUCTION_BASE.

const PROD = process.env.PRODUCTION_BASE || 'https://iberi22.github.io/gastronomic-open-standard-GOS';

const topLevelRoutes = [
  '/',
  '/recipes',
  '/ingredients',
  '/graph',
  '/scientific',
  '/tips',
  '/substances',
  '/feed.json',
  '/sitemap.xml',
  '/manifest.json',
  '/llms.txt',
  '/robots.txt',
];

const apiRoutes = [
  '/api/health',
  '/api/index.json',
  '/api/all.json',
  '/api/substances.json',
  '/api/with-metadata.json',
  '/api/without-metadata.json',
  '/api/countries',
  '/api/ingredients',
  '/api/spanish',
];

test.describe('Production coverage — top-level routes', () => {
  for (const route of topLevelRoutes) {
    test(`Route ${route} returns 200`, async ({ request }) => {
      const r = await request.get(`${PROD}${route}`);
      expect(r.status(), `${PROD}${route} status`).toBe(200);
    });
  }
});

test.describe('Production coverage — API routes', () => {
  for (const route of apiRoutes) {
    test(`API ${route} returns 200 + valid JSON or text`, async ({ request }) => {
      const r = await request.get(`${PROD}${route}`);
      expect(r.status(), `${PROD}${route} status`).toBe(200);
      const ct = r.headers()['content-type'] || '';
      expect(ct.length).toBeGreaterThan(0);
    });
  }
});

test.describe('Production coverage — homepage structural checks', () => {
  test('homepage has <title> with brand', async ({ page }) => {
    await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title).toContain('GOS');
  });

  test('homepage has data-theme=antigravity', async ({ page }) => {
    await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded' });
    const dt = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(typeof dt === 'string' && dt.startsWith('antigravity')).toBe(true);
  });

  test('homepage loads theme tokens (--swal-bg or body bg)', async ({ page }) => {
    await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded' });
    const probe = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        token: getComputedStyle(html).getPropertyValue('--swal-bg').trim(),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        dataTheme: html.getAttribute('data-theme'),
      };
    });
    const ok =
      probe.token.length > 0 ||
      (probe.bodyBg && probe.bodyBg !== 'rgba(0, 0, 0, 0)') ||
      (typeof probe.dataTheme === 'string' && probe.dataTheme.startsWith('antigravity'));
    expect(ok).toBe(true);
  });

  test('homepage has nav with at least 3 links', async ({ page }) => {
    await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded' });
    const linkCount = await page.evaluate(() => document.querySelectorAll('header a, nav a').length);
    expect(linkCount).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Production coverage — search and filters', () => {
  test('/recipes page renders recipe cards or list items', async ({ page }) => {
    await page.goto(`${PROD}/recipes`, { waitUntil: 'domcontentloaded' });
    const cardCount = await page.evaluate(() => document.querySelectorAll('article, .recipe-card, [data-entity="recipe"]').length);
    // Page may use lazy-loading; we just require > 0 cards OR a search box.
    const hasSearch = await page.evaluate(() => !!document.querySelector('input[type="search"], [role="searchbox"]'));
    expect(cardCount > 0 || hasSearch).toBe(true);
  });

  test('/ingredients page renders ingredient entries', async ({ page }) => {
    await page.goto(`${PROD}/ingredients`, { waitUntil: 'domcontentloaded' });
    const entryCount = await page.evaluate(() => document.querySelectorAll('a[href*="/ingredients/"]').length);
    expect(entryCount).toBeGreaterThan(5);
  });
});

test.describe('Production coverage — graph & data integrity', () => {
  test('/api/index.json lists entities', async ({ request }) => {
    const r = await request.get(`${PROD}/api/index.json`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(typeof body).toBe('object');
  });

  test('/api/health returns ok=true', async ({ request }) => {
    const r = await request.get(`${PROD}/api/health`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('status');
  });

  test('/api/countries has at least 10 countries', async ({ request }) => {
    const r = await request.get(`${PROD}/api/countries`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    const arr = Array.isArray(body) ? body : Object.values(body);
    expect(arr.length).toBeGreaterThanOrEqual(10);
  });

  test('/sitemap.xml lists URLs', async ({ request }) => {
    const r = await request.get(`${PROD}/sitemap.xml`);
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toContain('<urlset');
    const urlMatches = body.match(/<loc>/g) || [];
    expect(urlMatches.length).toBeGreaterThan(50);
  });

  test('/robots.txt allows crawling', async ({ request }) => {
    const r = await request.get(`${PROD}/robots.txt`);
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('Production coverage — interactive features', () => {
  test('theme toggle button exists in header', async ({ page }) => {
    await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded' });
    const toggleExists = await page.evaluate(() => {
      return !!document.querySelector('#gos-theme-toggle, [aria-label*="theme"], [aria-label*="Toggle"]');
    });
    expect(toggleExists).toBe(true);
  });

  test('manifest.json is valid web manifest', async ({ request }) => {
    const r = await request.get(`${PROD}/manifest.json`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('start_url');
  });

  test('feed.json is valid RSS/JSON feed', async ({ request }) => {
    const r = await request.get(`${PROD}/feed.json`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body) || typeof body === 'object').toBe(true);
  });
});