import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('mapo doufu is published', async ({ app, screen }) => {
  await app.open('/recipes/china/principales/mapo-doufu')
  await expect(
    screen.getByRole('heading', { name: 'Mapo Doufu (Mapo Tofu)' }).first(),
  ).toBeVisible()
  await expect(
    screen.getByRole('heading', { name: /麻婆豆腐/ }).first(),
  ).toBeVisible()
})

test('gongbao jiding is published', async ({ app, screen }) => {
  await app.open('/recipes/china/principales/gongbao-jiding')
  await expect(
    screen
      .getByRole('heading', { name: 'Gongbao Jiding (Kung Pao Chicken)' })
      .first(),
  ).toBeVisible()
  await expect(
    screen.getByRole('heading', { name: /宫保鸡丁/ }).first(),
  ).toBeVisible()
})

test('huiguo rou is published', async ({ app, screen }) => {
  await app.open('/recipes/china/principales/huiguo-rou')
  await expect(
    screen
      .getByRole('heading', { name: 'Huiguo Rou (Twice-Cooked Pork)' })
      .first(),
  ).toBeVisible()
  await expect(
    screen.getByRole('heading', { name: /回锅肉/ }).first(),
  ).toBeVisible()
})

test('an unlisted china dish stays off the site', async ({ app, screen }) => {
  await app.open('/recipes/china/principales/dongpo-rou')
  await expect(
    screen.getByRole('heading', { name: /esta página no está/i }).first(),
  ).toBeVisible()
})

test('tomato page shows the USDA figures', async ({ app, screen }) => {
  await app.open('/ingredients/vegetables/tomate')
  await expect(
    screen.getByRole('heading', { name: /Tomate Rojo/i }).first(),
  ).toBeVisible()
  await expect(screen.getByText('0.88').first()).toBeVisible()
  await expect(screen.getByText('3.89').first()).toBeVisible()
  await expect(screen.getByText('2.63').first()).toBeVisible()
})

test('a dish with source url pending still opens', async ({ app, screen }) => {
  await app.open('/recipes/french/ratatouille_provencale')
  await expect(
    screen.getByRole('heading', { name: 'Ratatouille Provençale' }).first(),
  ).toBeVisible()
})
