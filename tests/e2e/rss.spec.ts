import { test, expect } from '@playwright/test';

test.describe('RSS Feed & Countries Page', () => {
  test('serves feed.json with valid JSON Feed 1.1 structure', async ({ request }) => {
    const response = await request.get('/feed.json');
    expect(response.status()).toBe(200);

    const feed = await response.json();
    expect(feed.version).toContain('https://jsonfeed.org/version/');
    expect(feed.title).toBeTruthy();
    expect(feed.home_page_url).toBeTruthy();
    expect(feed.feed_url).toBeTruthy();
    expect(Array.isArray(feed.items)).toBe(true);
    expect(feed.items.length).toBeGreaterThan(0);

    const firstItem = feed.items[0];
    expect(firstItem.id).toBeTruthy();
    expect(firstItem.title).toBeTruthy();
    expect(firstItem.url).toBeTruthy();
  });

  test('loads countries page and displays country regions catalog', async ({ page }) => {
    await page.goto('/countries');
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('h1, .title').first();
    await expect(title).toBeVisible();

    const countryLinks = page.locator('a[href*="/countries/"]');
    const count = await countryLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('navigates to a specific country catalog page', async ({ page }) => {
    await page.goto('/countries');
    await page.waitForLoadState('domcontentloaded');

    const countryLink = page.locator('a[href*="/countries/"]').first();
    await expect(countryLink).toBeVisible();
    await countryLink.click();

    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/countries/');
  });
});
