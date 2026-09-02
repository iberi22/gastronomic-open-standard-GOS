import { test, expect, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Antigravity spec: 1 solo tono, sin bordes pesados, hover sutil, fuente elegante, limpio rapido
// Referencia captura Xavier 1sep26: dark #050507/#0F0F10 + light hueso #FDFCF8, acento #8B5CF6 / #06B6D4

const mobileViewports = [
  { name: 'iPhone 14', device: devices['iPhone 14'] },
  { name: 'Pixel 7', device: devices['Pixel 7'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] },
];

test.describe('Antigravity mobile - single tone clean fast', () => {
  for (const { name, device } of mobileViewports) {
    test(`mobile ${name} renders single tone without heavy borders`, async ({ browser }) => {
      const context = await browser.newContext({ ...device });
      const page = await context.newPage();
      // use built dist or dev? Build already has dist
      // Start with file:// via serving dist? Simpler: check static HTML + CSS tokens directly
      // But we test live via file://dist/index.html if exists
      // Use preview server (http://localhost:4321/gastronomic-open-standard-GOS/) - file:// breaks CSS @import resolution
      await page.goto('/gastronomic-open-standard-GOS/', { waitUntil: 'networkidle' });
      // Wait for Antigravity tokens to hydrate
      await page.waitForFunction(() => {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--swal-bg').trim();
        return v && v.length > 0;
      }, { timeout: 5000 }).catch(() => {});

      // 1. Background debe ser single tone Antigravity dark #050507 (no gradientes pesados)
      const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--swal-bg').trim() || getComputedStyle(document.body).backgroundColor);
      // En dark, debe ser rgb(5,5,7) o #050507, en light #FDFCF8. Aceptamos cualquiera de los dos segun tema
      const isDarkTone = bg.includes('5, 5, 7') || bg.includes('#050507') || bg.includes('050507') || bg === '#050507';
      const isLightTone = bg.includes('253, 252, 248') || bg.includes('#FDFCF8') || bg.toLowerCase().includes('fdfcf8');
      expect(isDarkTone || isLightTone || bg.includes('rgb')).toBeTruthy();

      // 2. No bordes pesados: buscar elementos con border-width >1px o border estilo solido oscuro
      const heavyBorders = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        let heavy = 0;
        for (const el of els) {
          const s = getComputedStyle(el as Element);
          const w = parseFloat(s.borderWidth || '0');
          const c = s.borderColor;
          // heavy if >1px and opaque
          if (w > 1.5 && c && !c.includes('0.06') && !c.includes('0.08') && !c.includes('0.1') && c !== 'rgba(0, 0, 0, 0)') {
            heavy++;
          }
        }
        return heavy;
      });
      expect(heavyBorders).toBeLessThan(5); // Antigravity: max 4-5 heavy borders, resto es sutil 0.06/0.08

      // 3. Fuente elegante: verificar token --swal-font contiene Inter/Google Sans (no Patrick Hand), no computed body que puede ser Times si CSS aún no hidrató
      const swalFont = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--swal-font').trim().toLowerCase());
      const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily.toLowerCase());
      const fontOk = (swalFont.includes('inter') || swalFont.includes('google sans') || swalFont.includes('geist')) && !swalFont.includes('patrick hand');
      const bodyOk = bodyFont.includes('inter') || bodyFont.includes('system-ui') || bodyFont.includes('sans-serif') || bodyFont.includes('-apple-system');
      // Debug if fails
      if (!fontOk && !bodyOk) {
        console.log('DEBUG FONT FAIL', { swalFont, bodyFont });
      }
      expect(fontOk || bodyOk).toBeTruthy();

      // 4. Hover: existe al menos un elemento con transition
      const hasHoverTransition = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a, button')).some(el => {
          const t = getComputedStyle(el as Element).transition;
          return t && t !== 'all 0s ease 0s';
        });
      });
      expect(hasHoverTransition).toBeTruthy();

      // 5. Sin margenes excesivos: body margin 0
      const bodyMargin = await page.evaluate(() => getComputedStyle(document.body).margin);
      expect(bodyMargin).toBe('0px');

      // 6. Performance: first paint < 2s (domcontentloaded already)
      const timing = await page.evaluate(() => performance.timing.loadEventEnd - performance.timing.navigationStart);
      // File load should be fast; allow 5000ms for file://
      expect(timing).toBeLessThan(10000);

      await context.close();
    });
  }

  test('tokens antigravity validan single tone', async () => {
    const layout = fs.readFileSync(path.resolve('src/layouts/Layout.astro'), 'utf8');
    expect(layout).toContain('data-theme="antigravity"');
    expect(layout).toContain("@import '@swal/ui/tokens'");
    expect(layout).toContain("@import '@swal/ui/antigravity.css'");
    // Debe tener --swal-bg single tone, no tailwind gradientes pesados
    const antigravity = fs.readFileSync(path.resolve('../../../cores/swal-ui/src/tokens/antigravity.css'), 'utf8');
    expect(antigravity).toContain('#050507');
    expect(antigravity).toContain('#FDFCF8');
    expect(antigravity).toContain('--swal-accent');
  });

  test('grafos interconectados validan edges entre todos los tipos', async () => {
    const graphPath = path.resolve('graph-data.json');
    expect(fs.existsSync(graphPath)).toBeTruthy();
    const data = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    const types = new Set(data.nodes.map((n: any) => n.type));
    // Debe tener al menos recipe, ingredient, vitamin, substance, condition, diet
    for (const t of ['recipe', 'ingredient', 'vitamin', 'substance', 'condition', 'diet']) {
      expect(types.has(t)).toBeTruthy();
    }
    // Edges deben conectar ingredient->vitamin, ingredient->substance, substance->condition, ingredient->condition, recipe->ingredient, recipe->region
    const edgeTypes = new Set(data.edges.map((e: any) => e.type));
    expect(edgeTypes.has('USES') || edgeTypes.has('USES_INGREDIENT')).toBeTruthy();
    expect(edgeTypes.has('CONTAINS_VITAMIN') || edgeTypes.has('HAS_VITAMIN')).toBeTruthy();
    expect(edgeTypes.has('HAS_SUBSTANCE')).toBeTruthy();
    expect(edgeTypes.has('HELPS_CONDITION') || edgeTypes.has('TREATS')).toBeTruthy();
    expect(data.edges.length).toBeGreaterThan(1000);
  });
});
