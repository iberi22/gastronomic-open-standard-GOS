import { test, expect } from '@playwright/test';

test.describe('Ingredients Search & Details', () => {
  test('loads ingredient search page and lists ingredients', async ({ page }) => {
    await page.goto('/ingredients');
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('.title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Ingredientes científicos');

    const resultCards = page.locator('.search-results .result-card');
    await expect(resultCards.first()).toBeVisible({ timeout: 10000 });
    const count = await resultCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('searches ingredient by term', async ({ page }) => {
    await page.goto('/ingredients');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('ajo');
    await page.waitForTimeout(300);

    const resultCards = page.locator('.search-results .result-card');
    await expect(resultCards.first()).toBeVisible();
    const count = await resultCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filters ingredients by facet pills', async ({ page }) => {
    await page.goto('/ingredients');
    await page.waitForLoadState('domcontentloaded');

    const facetPills = page.locator('.facet-row .pill');
    const count = await facetPills.count();
    expect(count).toBeGreaterThan(0);

    // Click on "Todas" pill to ensure active state reset / pill interaction works
    const firstPill = facetPills.first();
    await firstPill.click();

    await expect(firstPill).toHaveClass(/active/);
    const resultCards = page.locator('.search-results .result-card');
    await expect(resultCards.first()).toBeVisible();
  });

  test('navigates to ingredient detail page and renders scientific information', async ({ page }) => {
    await page.goto('/ingredients');
    await page.waitForLoadState('domcontentloaded');

    const firstCard = page.locator('.search-results .result-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/ingredients/');

    const article = page.locator('article.article');
    await expect(article).toBeVisible();

    const heading = article.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('contains JSON-LD structured data on ingredient detail page', async ({ page }) => {
    await page.goto('/ingredients');
    await page.waitForLoadState('domcontentloaded');

    const firstCard = page.locator('.search-results .result-card').first();
    await firstCard.click();
    await page.waitForLoadState('domcontentloaded');

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toBeAttached();

    const content = await jsonLdScript.innerHTML();
    const json = JSON.parse(content);
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('IndividualProduct');
    expect(json.name).toBeTruthy();
  });
});
