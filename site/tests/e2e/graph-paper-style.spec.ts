import { expect, test } from '@playwright/test'

// Verifica el contrato visual del grafo "paper & ink":
//  - sin bordes ni radios (lienzo desnudo)
//  - 2 tonos: el color de nodo es tinta con alfa (sin colores por tipo)
//  - encuadrado al viewport (cobertura > 0.85)
//  - filtros y ficha funcionan, consola limpia

interface GeDebug {
  visible: number
  coverage: { x: number; y: number; fill: number }
}

type GeWindow = Window & { __geDebug?: () => GeDebug }

test('grafo paper-ink: sin bordes, encuadrado, filtros y ficha', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/graph', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('#ge-canvas canvas', { timeout: 30000 })
  await page.waitForFunction(() => Boolean((window as GeWindow).__geDebug), {
    timeout: 30000,
  })
  await page.waitForTimeout(1500)

  // 1. lienzo sin bordes ni radio, con fondo propio (papel)
  const style = await page.evaluate(() => {
    const el = document.getElementById('ge-wrapper')
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      border: cs.borderTopWidth,
      radius: cs.borderRadius,
      bg: cs.backgroundColor,
    }
  })
  expect(style).not.toBeNull()
  expect(style?.border).toBe('0px')
  expect(Number.parseFloat(style?.radius ?? '1')).toBe(0)
  expect(style?.bg).not.toBe('rgba(0, 0, 0, 0)')

  // 2. monocromo: el color de nodo es tinta con alfa (r=g=b), nunca un color de tipo
  const colors = await page.evaluate(() => {
    const w = window as GeWindow & {
      __ge?: {
        graph: {
          forEachNode: (cb: (id: string, a: { color: string }) => void) => void
        }
      }
    }
    const out: string[] = []
    w.__ge?.graph.forEachNode((_id, a) => {
      if (out.length < 40) out.push(a.color)
    })
    return out
  })
  expect(colors.length).toBeGreaterThan(0)
  for (const c of colors) {
    const m = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    expect(m, `color no-rgba: ${c}`).not.toBeNull()
    expect(Math.abs(Number(m?.[1]) - Number(m?.[3]))).toBeLessThanOrEqual(2)
  }

  // 3. encuadre: el grafo llena el lienzo
  const dbg = await page.evaluate(() => (window as GeWindow).__geDebug?.())
  expect(dbg?.visible ?? 0).toBeGreaterThan(300)
  expect(dbg?.coverage.fill ?? 0).toBeGreaterThan(0.85)

  // 4. filtros por tipo cambian la capa visible
  const before = await page.textContent('#ge-visible-count')
  await page.click('.ge-filter-btn[data-type="condition"]')
  await page.waitForTimeout(700)
  const after = await page.textContent('#ge-visible-count')
  expect(after).not.toBe(before)

  // 5. búsqueda → ficha lateral
  await page.fill('#ge-search-input', 'ajo')
  await page.waitForTimeout(500)
  const results = page.locator('.ge-search-item')
  await expect(results.first()).toBeVisible()
  await results.first().click()
  await page.waitForTimeout(1200)
  await expect(page.locator('#ge-detail')).toHaveClass(/open/)
  await expect(page.locator('#ge-detail-title')).not.toBeEmpty()

  expect(errors).toEqual([])
})

test('grafo paper-ink: móvil 390 sin overflow horizontal', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/graph', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('#ge-canvas canvas', { timeout: 30000 })
  await page.waitForFunction(() => Boolean((window as GeWindow).__geDebug), {
    timeout: 30000,
  })
  await page.waitForTimeout(1500)
  const dbg = await page.evaluate(() => (window as GeWindow).__geDebug?.())
  expect(dbg?.coverage.fill ?? 0).toBeGreaterThan(0.85)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflow).toBe(false)
  expect(errors).toEqual([])
  await context.close()
})
