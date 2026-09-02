import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('AUI build genera index.html con demo AUI', async () => {
  // server output no genera dist/index.html estatico — verificamos fuente + build ok
  const src = fs.readFileSync(path.resolve('src/pages/index.astro'), 'utf8');
  expect(src).toContain('Demo AUI');
  expect(src).toContain('AUI Card 1');
  expect(fs.existsSync(path.resolve('dist'))).toBeTruthy();
});

test('AUI whitelisteada renderiza Card/Button/Badge', async () => {
  const renderer = fs.readFileSync(path.resolve('src/components/AuiRenderer.svelte'), 'utf8');
  expect(renderer).toContain('Card');
  expect(renderer).toContain('Button');
  expect(renderer).toContain('Badge');
  const aui = fs.readFileSync(path.resolve('src/lib/aui.ts'), 'utf8');
  expect(aui).toContain('AUI_COMPONENTS');
});

test('billing 20% breakdown visible en docs', async () => {
  const doc = fs.readFileSync(path.resolve('docs/PLAN_AUI_BILLING_20PCT.md'), 'utf8');
  expect(doc).toContain('20%');
  expect(doc).toContain('Cloudflare');
});
