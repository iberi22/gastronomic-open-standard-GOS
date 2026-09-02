import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Top 20 Worldwide Catalog Verification', () => {
  test('catalog.json exists and contains required country recipe counts', async () => {
    const catalogPath = path.resolve(process.cwd(), 'public/api/countries/catalog.json');
    expect(fs.existsSync(catalogPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    expect(Array.isArray(content)).toBe(true);

    const requiredCountries = ['mexican', 'japanese', 'italian', 'indian', 'french', 'thai', 'spanish', 'american', 'moroccan', 'greek'];

    for (const country of requiredCountries) {
      const entry = content.find((c: any) => c.country === country);
      expect(entry).toBeDefined();
      expect(entry.count).toBe(20);
      expect(entry.recipes.length).toBe(20);
    }
  });
});
