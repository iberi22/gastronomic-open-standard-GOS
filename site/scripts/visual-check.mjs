// scripts/visual-check.mjs — captura visual + guardia de consola para GOS
// Uso:  node scripts/visual-check.mjs <fase>   (fase ej: before | after)
// Requiere el dev/preview server en http://127.0.0.1:4321
// Cumple la regla del owner: capturas desktop+móvil (2 temas), consola 0 errores.
import fs from 'node:fs'
import { chromium } from '@playwright/test'

const phase = process.argv[2] || 'shot'
const base = process.env.GOS_BASE || 'http://127.0.0.1:4321'
const out = `/tmp/gos-shots/${phase}`
fs.mkdirSync(out, { recursive: true })

const targets = [
  { name: 'graph', url: `${base}/graph`, sel: '#ge-wrapper' },
  { name: 'home', url: `${base}/`, sel: '.gos-graph-wrap' },
]
const themes = ['antigravity-light', 'antigravity']
const vps = [
  { name: 'desktop', w: 1440, h: 900 },
  { name: 'mobile', w: 390, h: 844 },
]

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

const report = []
for (const t of targets) {
  for (const th of themes) {
    for (const vp of vps) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 1,
      })
      await ctx.addInitScript((theme) => {
        try {
          localStorage.setItem('gos-theme', theme)
        } catch {}
      }, th)
      const page = await ctx.newPage()
      const errors = []
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text().slice(0, 260))
      })
      page.on('pageerror', (e) =>
        errors.push('PAGEERROR: ' + String(e).slice(0, 260)),
      )
      let status = 0
      try {
        const resp = await page.goto(t.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })
        status = resp ? resp.status() : 0
      } catch (e) {
        errors.push('GOTO: ' + String(e).slice(0, 200))
      }
      try {
        await page.waitForSelector(`${t.sel} canvas`, { timeout: 30000 })
      } catch {
        errors.push('NO_CANVAS')
      }
      try {
        await page.waitForFunction(
          () => {
            const l = document.getElementById('ge-loading')
            return !l || getComputedStyle(l).display === 'none'
          },
          { timeout: 30000 },
        )
      } catch {
        errors.push('LOADING_TIMEOUT')
      }
      await page.waitForTimeout(2000)
      // el dev toolbar de Astro solo existe en dev y ensucia las capturas
      await page.evaluate(() => {
        document.querySelector('astro-dev-toolbar')?.remove()
      })
      const metrics = await page.evaluate((sel) => {
        const el = document.querySelector(sel)
        const cs = el ? getComputedStyle(el) : null
        const dbg = window.__geDebug ? window.__geDebug() : null
        return {
          hasCanvas: !!document.querySelector(`${sel} canvas`),
          wrapperBg: cs ? cs.backgroundColor : null,
          border: cs ? cs.borderTopWidth + ' ' + cs.borderTopStyle : null,
          radius: cs ? cs.borderRadius : null,
          hOverflow:
            document.documentElement.scrollWidth > window.innerWidth + 1,
          theme: document.documentElement.getAttribute('data-theme'),
          nodesText:
            document.body.innerText.match(/\d[\d.\s]*\s*(nodos|NODOS)/i)?.[0] ||
            null,
          filterFont: (() => {
            const b = document.querySelector('.ge-filter-btn')
            if (!b) return null
            const s = getComputedStyle(b)
            return s.fontSize + ' ' + s.textTransform + ' ' + s.letterSpacing
          })(),
          graph: dbg
            ? {
                visible: dbg.visible,
                coverage: dbg.coverage,
                camera: dbg.camera,
              }
            : null,
        }
      }, t.sel)
      const el = await page.$(t.sel)
      const shot = `${out}/${t.name}-${th}-${vp.name}.png`
      if (el) await el.screenshot({ path: shot })
      else await page.screenshot({ path: shot })
      await page.screenshot({
        path: `${out}/${t.name}-${th}-${vp.name}-page.png`,
      })
      report.push({
        target: t.name,
        theme: th,
        vp: vp.name,
        status,
        errors: errors.length,
        firstErrors: errors.slice(0, 3),
        metrics,
      })
      await ctx.close()
    }
  }
}
await browser.close()
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1))
for (const r of report) {
  const g = r.metrics.graph
  console.log(
    `${r.target.padEnd(6)} ${r.theme.padEnd(18)} ${r.vp.padEnd(8)} http=${r.status} err=${r.errors} canvas=${r.metrics.hasCanvas} border=${r.metrics.border} radius=${r.metrics.radius} ovf=${r.metrics.hOverflow} font=${r.metrics.filterFont}` +
      (g
        ? ` vis=${g.visible} covX=${g.coverage.x.toFixed(2)} covY=${g.coverage.y.toFixed(2)} fill=${g.coverage.fill.toFixed(2)}`
        : ''),
  )
  r.firstErrors.forEach((e) => {
    console.log('    ↳ ' + e)
  })
}
console.log('shots →', out)
