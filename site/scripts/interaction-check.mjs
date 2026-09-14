// scripts/interaction-check.mjs — verifica interacciones reales del explorador
// Uso: node scripts/interaction-check.mjs <fase>
import fs from 'node:fs'
import { chromium } from '@playwright/test'

const phase = process.argv[2] || 'int'
const base = process.env.GOS_BASE || 'http://127.0.0.1:4321'
const out = `/tmp/gos-shots/${phase}`
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH || '/run/current-system/sw/bin/chromium',
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
})
const results = []
const errors = []
const step = async (name, fn) => {
  try {
    const detalle = await fn()
    results.push({
      step: name,
      ok: true,
      detalle: detalle === undefined ? '' : String(detalle),
    })
  } catch (e) {
    results.push({
      step: name,
      ok: false,
      detalle: 'EXC ' + String(e).slice(0, 180).replace(/\s+/g, ' '),
    })
  }
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('gos-theme', 'antigravity-light')
  } catch {}
})
const page = await ctx.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 200))
})
page.on('pageerror', (e) =>
  errors.push('PAGEERROR: ' + String(e).slice(0, 200)),
)

await page.goto(`${base}/graph`, {
  waitUntil: 'domcontentloaded',
  timeout: 30000,
})
await page.waitForSelector('#ge-canvas canvas', { timeout: 30000 })
await page.waitForFunction(
  () => document.getElementById('ge-loading')?.style.display === 'none',
  { timeout: 30000 },
)
await page.waitForTimeout(2500)
await page.evaluate(() => {
  document.querySelector('astro-dev-toolbar')?.remove()
})

const nodeAt = (p) =>
  p.evaluate(() => {
    const { graph: g, renderer: r } = window.__ge
    let best = null,
      bs = -1
    g.forEachNode((id, a) => {
      if (a.hidden) return
      if (a.size > bs) {
        bs = a.size
        best = id
      }
    })
    const d = r.getNodeDisplayData(best)
    const vp = r.framedGraphToViewport(d) // conversión exacta de sigma
    return { px: vp.x, py: vp.y, label: g.getNodeAttribute(best, 'label') }
  })

const canvasBox = await page.locator('#ge-canvas').boundingBox()
const hub = await nodeAt(page)

// 1) hover real sobre el hub → chip de resaltado
await step('hover-nodo', async () => {
  await page.mouse.move(canvasBox.x + hub.px, canvasBox.y + hub.py)
  await page.waitForTimeout(700)
  const chip = await page.evaluate(() => {
    const c = document.getElementById('ge-hl-chip')
    return c && !c.hidden ? c.textContent : null
  })
  await page.screenshot({ path: `${out}/hover.png` })
  if (!chip) throw new Error('sin chip de resaltado')
  return chip + ' · nodo=' + hub.label
})

// 2) búsqueda → resultado → ficha (cierra la ficha al terminar)
let focusCount = null
await step('busqueda-y-ficha', async () => {
  await page.fill('#ge-search-input', 'ajo')
  await page.waitForTimeout(500)
  const n = await page.locator('.ge-search-item').count()
  if (!n) throw new Error('sin resultados')
  await page.screenshot({ path: `${out}/busqueda.png` })
  await page.locator('.ge-search-item').first().click()
  await page.waitForTimeout(1600)
  const open = await page.evaluate(() =>
    document.getElementById('ge-detail')?.classList.contains('open'),
  )
  const title = await page.evaluate(
    () => document.getElementById('ge-detail-title')?.textContent || '',
  )
  const body = await page.evaluate(
    () => (document.getElementById('ge-detail-body')?.textContent || '').length,
  )
  focusCount = await page.evaluate(
    () => document.getElementById('ge-visible-count')?.textContent,
  )
  await page.screenshot({ path: `${out}/ficha.png` })
  if (!open || body < 40)
    throw new Error(`ficha abierta=${open} cuerpo=${body}`)
  return `${n} resultados → titulo="${title}" cuerpo=${body} chars · visibles=${focusCount}`
})
await step('cerrar-ficha', async () => {
  await page.evaluate(() => document.getElementById('ge-detail-close')?.click())
  await page.waitForTimeout(500)
  const closed = await page.evaluate(
    () => !document.getElementById('ge-detail').classList.contains('open'),
  )
  if (!closed) throw new Error('la ficha no se cerró')
  return 'ok'
})

// 3) cobertura tras reset de cámara
await step('cobertura-tras-foco', async () => {
  await page.evaluate(() => document.getElementById('ge-zoom-reset')?.click())
  await page.waitForTimeout(1500)
  const c = await page.evaluate(() => {
    const d = window.__geDebug()
    return { fill: +d.coverage.fill.toFixed(3), visible: d.visible }
  })
  if (c.fill <= 0.85) throw new Error('fill ' + c.fill)
  return JSON.stringify(c)
})

// 4) filtro: apagar y encender INGREDIENTES
await step('filtro-visibles', async () => {
  const read = () =>
    page.evaluate(
      () => document.getElementById('ge-visible-count')?.textContent,
    )
  const before = await read()
  await page.evaluate(() =>
    document.querySelector('.ge-filter-btn[data-type="ingredient"]')?.click(),
  )
  await page.waitForTimeout(1200)
  const mid = await read()
  await page.evaluate(() => document.getElementById('ge-zoom-reset')?.click())
  await page.waitForTimeout(1400)
  const fillOff = await page.evaluate(
    () => +window.__geDebug().coverage.fill.toFixed(3),
  )
  await page.screenshot({ path: `${out}/filtros.png` })
  await page.evaluate(() =>
    document.querySelector('.ge-filter-btn[data-type="ingredient"]')?.click(),
  )
  await page.waitForTimeout(1200)
  const after = await read()
  await page.evaluate(() => document.getElementById('ge-zoom-reset')?.click())
  await page.waitForTimeout(1400)
  const fillOn = await page.evaluate(
    () => +window.__geDebug().coverage.fill.toFixed(3),
  )
  if (before === mid) throw new Error('el filtro no cambió los visibles')
  return `off=${mid} (fill ${fillOff}) · on=${after} (fill ${fillOn})`
})

// 4.5) revelado contextual: clic en un hub con capas apagadas enciende sus vecinos
await step('revelado-contextual', async () => {
  await page.evaluate(() => document.getElementById('ge-zoom-reset')?.click())
  await page.waitForTimeout(1200)
  // asegura que las capas densas están apagadas
  for (const t of ['ingredient', 'flavor', 'texture']) {
    const on = await page.evaluate(
      (tt) =>
        document
          .querySelector(`.ge-filter-btn[data-type="${tt}"]`)
          ?.classList.contains('on'),
      t,
    )
    if (on) {
      await page.evaluate(
        (tt) =>
          document.querySelector(`.ge-filter-btn[data-type="${tt}"]`)?.click(),
        t,
      )
      await page.waitForTimeout(400)
    }
  }
  const base = await page.evaluate(() => window.__geDebug().visible)
  const target = await page.evaluate(() => {
    const { graph: g, renderer: r } = window.__ge
    let best = null,
      bestDeg = -1
    for (const cand of [
      'category_proteins',
      'category_vegetables',
      'category_grains',
    ]) {
      if (!g.hasNode(cand)) continue
      const deg = g.neighbors(cand).length
      if (deg > bestDeg) {
        bestDeg = deg
        best = cand
      }
    }
    const d = r.getNodeDisplayData(best)
    const vp = r.framedGraphToViewport(d)
    const rect = document.getElementById('ge-canvas').getBoundingClientRect()
    return { x: rect.left + vp.x, y: rect.top + vp.y, id: best, deg: bestDeg }
  })
  await page.mouse.move(target.x, target.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(2600)
  const after = await page.evaluate(() => {
    const d = window.__geDebug()
    return { visible: d.visible, revealed: d.revealed }
  })
  await page.screenshot({ path: `${out}/revelado.png` })
  // limpiar y comprobar reversibilidad
  await page.evaluate(() => document.getElementById('ge-hl-chip')?.click())
  await page.waitForTimeout(1200)
  const cleaned = await page.evaluate(() => {
    const d = window.__geDebug()
    return { visible: d.visible, revealed: d.revealed }
  })
  if (!(after.revealed > 100))
    throw new Error(`no reveló vecinos (revealed=${after.revealed})`)
  if (cleaned.revealed !== 0 || cleaned.visible !== base)
    throw new Error(`no revirtió (${JSON.stringify(cleaned)} vs base ${base})`)
  return `${target.id} (${target.deg} vecinos): ${base} → ${after.visible} revelados=${after.revealed} → limpiado ${cleaned.visible}`
})

// 5) cambio de tema en vivo → repintado
await step('repintado-tema', async () => {
  const colorBefore = await page.evaluate(() => {
    const g = window.__ge.graph
    const id = g.nodes().find((n) => !g.getNodeAttribute(n, 'hidden'))
    return g.getNodeAttribute(id, 'color')
  })
  await page.evaluate(() =>
    document.getElementById('gos-theme-toggle')?.click(),
  )
  await page.waitForTimeout(1200)
  const colorAfter = await page.evaluate(() => {
    const g = window.__ge.graph
    const id = g.nodes().find((n) => !g.getNodeAttribute(n, 'hidden'))
    return g.getNodeAttribute(id, 'color')
  })
  const theme = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme'),
  )
  await page.screenshot({ path: `${out}/tema-oscuro.png` })
  if (colorBefore === colorAfter) throw new Error('la paleta no se repintó')
  return `${colorBefore?.slice(0, 22)}… → ${colorAfter?.slice(0, 22)}… (${theme})`
})

// 6) móvil 390px
await step('movil', async () => {
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
  })
  await mctx.addInitScript(() => {
    try {
      localStorage.setItem('gos-theme', 'antigravity-light')
    } catch {}
  })
  const mpage = await mctx.newPage()
  mpage.on('console', (m) => {
    if (m.type() === 'error') errors.push('MOVIL: ' + m.text().slice(0, 200))
  })
  mpage.on('pageerror', (e) =>
    errors.push('MOVIL PAGEERROR: ' + String(e).slice(0, 200)),
  )
  await mpage.goto(`${base}/graph`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await mpage.waitForSelector('#ge-canvas canvas', { timeout: 30000 })
  await mpage.waitForTimeout(3000)
  await mpage.evaluate(() => {
    document.querySelector('astro-dev-toolbar')?.remove()
  })
  const cov = await mpage.evaluate(() => {
    const d = window.__geDebug()
    return { fill: +d.coverage.fill.toFixed(3), cont: d.container }
  })
  const mBox = await mpage.locator('#ge-canvas').boundingBox()
  const node = await nodeAt(mpage)
  await mpage.mouse.move(mBox.x + node.px, mBox.y + node.py)
  await mpage.mouse.down()
  await mpage.mouse.up()
  await mpage.waitForTimeout(1500)
  const open = await mpage.evaluate(() =>
    document.getElementById('ge-detail')?.classList.contains('open'),
  )
  await mpage.screenshot({ path: `${out}/movil-ficha.png` })
  await mpage.evaluate(() =>
    document.getElementById('ge-detail-close')?.click(),
  )
  await mpage.waitForTimeout(500)
  await mpage.evaluate(() =>
    document.querySelector('.ge-filter-btn[data-type="substance"]')?.click(),
  )
  await mpage.waitForTimeout(1200)
  const vis = await mpage.evaluate(
    () => document.getElementById('ge-visible-count')?.textContent,
  )
  const overflow = await mpage.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  await mpage.screenshot({ path: `${out}/movil-390.png` })
  await mctx.close()
  if (cov.fill <= 0.85) throw new Error('fill ' + cov.fill)
  if (!open) throw new Error('el tap no abrió la ficha')
  if (overflow) throw new Error('overflow horizontal en 390px')
  return `fill=${cov.fill} cont=${cov.cont.w}x${cov.cont.h} · tap-ficha=ok · filtro visibles=${vis}`
})

await ctx.close()
await browser.close()
fs.writeFileSync(
  `${out}/interactions.json`,
  JSON.stringify({ results, errors }, null, 1),
)
for (const r of results)
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.step.padEnd(22)} ${r.detalle}`)
console.log(`errores de consola: ${errors.length}`)
errors.slice(0, 5).forEach((e) => {
  console.log('  ↳ ' + e)
})
console.log('capturas →', out)
