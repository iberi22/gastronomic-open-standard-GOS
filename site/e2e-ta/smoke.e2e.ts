import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('home opens with the GOS heading', async ({ app, screen }) => {
  await app.open('/')
  const heading = screen.getByRole('heading', { name: /GOS/i }).first()
  await expect(heading).toBeVisible()
})

test('ingredients index lists entries and one ingredient detail page opens', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/ingredients')
  const title = screen.getByRole('heading', { name: /Ingredientes/i })
  await expect(title).toBeVisible()

  const link = screen.getByRole('link', { name: /^Ajo Allium sativum/i })
  await expect(link).toBeVisible()
  await link.tap()

  await expect(browser).toHaveURL(/\/ingredients\//)
})

test('recipes index lists entries and one recipe detail page opens', async ({
  app,
  screen,
  browser,
}) => {
  await app.open('/recipes')
  const title = screen.getByRole('heading', { name: /Recetas/i }).first()
  await expect(title).toBeVisible()

  const link = screen.getByRole('link', { name: /Ajiaco Santafereño/i })
  await expect(link).toBeVisible()
  await link.tap()

  await expect(browser).toHaveURL(/\/recipes\//)
})

test('graph page renders its canvas or SVG container', async ({
  app,
  screen,
}) => {
  await app.open('/graph')
  const title = screen.getByRole('heading', { name: /Grafo/i }).first()
  await expect(title).toBeVisible()
})

test('unknown route shows the 404 page', async ({ app, screen }) => {
  await app.open('/route-that-does-not-exist-404-check')
  const heading = screen.getByRole('heading', { name: /esta página no está/i })
  await expect(heading).toBeVisible()
})

test('one public JSON endpoint under /api/ answers with valid JSON', async ({
  app,
  browser,
}) => {
  await app.open('/api/index.json')
  const text = await browser.evaluate(() => document.body.innerText)
  const json = JSON.parse(text)
  expect(typeof json).toBe('object')
})
