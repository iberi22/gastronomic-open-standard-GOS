import { test, expect } from '@playwright/test';

test.describe('PWA & Offline Functionality', () => {
  test('serves web app manifest with valid JSON', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.name).toBeTruthy();
    expect(json.short_name).toBeTruthy();
    expect(json.icons).toBeDefined();
    expect(Array.isArray(json.icons)).toBe(true);
  });

  test('PWA icons and favicon are accessible', async ({ request }) => {
    const faviconRes = await request.get('/favicon.svg');
    expect(faviconRes.status()).toBe(200);

    const iconRes = await request.get('/icons/icon-192.svg');
    expect(iconRes.status()).toBe(200);
  });

  test('offline banner remains hidden when online', async ({ page }) => {
    await page.goto('/');
    const offlineBanner = page.locator('#offline-banner');
    await expect(offlineBanner).toBeHidden();
  });

  test('offline banner element exists and handles online/offline status correctly', async ({ page, context }) => {
    await page.goto('/');
    const offlineBanner = page.locator('#offline-banner');
    // Ensure the offline banner element is in the DOM
    await expect(offlineBanner).toBeAttached();

    // Trigger offline event on window
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    await expect(offlineBanner).toBeVisible();
    await expect(offlineBanner).toContainText('Modo offline');

    // Restore online state on window
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    await expect(offlineBanner).toBeHidden();
  });
});
