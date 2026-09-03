import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads home page successfully and checks title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GOS/);
  });

  test('renders hero section and heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Grafo gastronómico global');
  });

  test('displays key highlights grid section with cards', async ({ page }) => {
    await page.goto('/');
    const highlights = page.locator('.grid-highlights');
    await expect(highlights).toBeVisible();

    const recipeCard = page.getByText('Recetas', { exact: false }).first();
    await expect(recipeCard).toBeVisible();
    const ingredientsCard = page.getByText('Ingredientes', { exact: false }).first();
    await expect(ingredientsCard).toBeVisible();
  });

  test('renders quick links and CTA buttons', async ({ page }) => {
    await page.goto('/');
    const ctaContainer = page.locator('.cta');
    await expect(ctaContainer).toBeVisible();

    const recipesLink = page.locator('a[href$="/recipes"]').first();
    await expect(recipesLink).toBeVisible();

    const ingredientsLink = page.locator('a[href$="/ingredients"]').first();
    await expect(ingredientsLink).toBeVisible();
  });

  test('has correct meta and theme attributes in header', async ({ page }) => {
    await page.goto('/');
    const metaContainer = page.locator('.meta');
    await expect(metaContainer).toBeVisible();
  });
});
