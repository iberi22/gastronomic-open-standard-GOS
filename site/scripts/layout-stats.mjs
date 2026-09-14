// scripts/layout-stats.mjs — mide la calidad del layout precomputado (FA2)
// uso: node scripts/layout-stats.mjs [ruta/graph-data.json]
// Métricas: factor de tendril (extensión total vs percentil 99), ocupación de
// rejilla (cuánto del área útil está vacía) y longitud de aristas.
import fs from 'node:fs'

const file = process.argv[2] || 'public/graph-data.json'
const d = JSON.parse(fs.readFileSync(file, 'utf8'))
const nodes = d.nodes.filter(
  (n) => typeof n.x === 'number' && typeof n.y === 'number',
)
const q = (arr, p) =>
  arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)))]

const xs = nodes.map((n) => n.x).sort((a, b) => a - b)
const ys = nodes.map((n) => n.y).sort((a, b) => a - b)
const span = (arr, p) => q(arr, 1 - p) - q(arr, p)

const full = Math.max(xs[xs.length - 1] - xs[0], ys[ys.length - 1] - ys[0])
const p99 = Math.max(span(xs, 0.01), span(ys, 0.01))
const p95 = Math.max(span(xs, 0.05), span(ys, 0.05))
// tendril: cuánto estira la cola extrema respecto al núcleo utilizable
const tendril = full / p99
const tendril95 = full / p95

// ocupación: rejilla 16x16 sobre la caja p1..p99 → % de celdas con nodos
const x0 = q(xs, 0.01),
  x1 = q(xs, 0.99),
  y0 = q(ys, 0.01),
  y1 = q(ys, 0.99)
const G = 16
const cells = new Set()
for (const n of nodes) {
  const cx = Math.min(
    G - 1,
    Math.max(0, Math.floor(((n.x - x0) / (x1 - x0 || 1)) * G)),
  )
  const cy = Math.min(
    G - 1,
    Math.max(0, Math.floor(((n.y - y0) / (y1 - y0 || 1)) * G)),
  )
  cells.add(cy * G + cx)
}
const occupancy = cells.size / (G * G)

// longitudes de arista (en unidades normalizadas del layout)
const pos = new Map(nodes.map((n) => [n.id, n]))
const lens = []
for (const e of d.edges) {
  const a = pos.get(e.source)
  const b = pos.get(e.target)
  if (!a || !b) continue
  lens.push(Math.hypot(a.x - b.x, a.y - b.y))
}
lens.sort((p, q2) => p - q2)
const medEdge = lens.length ? q(lens, 0.5) : 0
const p95Edge = lens.length ? q(lens, 0.95) : 0
const maxEdge = lens.length ? lens[lens.length - 1] : 0

console.log(`archivo      ${file}`)
console.log(`nodos        ${nodes.length}   aristas ${d.edges.length}`)
console.log(
  `extensión    x ${(xs[0]).toFixed(4)}..${(xs[xs.length - 1]).toFixed(4)}  y ${(ys[0]).toFixed(4)}..${(ys[ys.length - 1]).toFixed(4)}`,
)
console.log(
  `p95 / p99    ${p95.toFixed(4)} / ${p99.toFixed(4)}   (full ${full.toFixed(4)})`,
)
console.log(
  `TENDRIL      full/p99 = ${tendril.toFixed(2)}   full/p95 = ${tendril95.toFixed(2)}   (1.0 = sin colas)`,
)
console.log(
  `OCUPACIÓN    ${(occupancy * 100).toFixed(1)}% de la rejilla 16x16 (sobre caja p1..p99)`,
)
console.log(
  `aristas      mediana ${medEdge.toFixed(4)}  p95 ${p95Edge.toFixed(4)}  max ${maxEdge.toFixed(4)}`,
)
