// scripts/diagnose-pending.mjs — cuantifica el impacto de ingredients/pending_review
// en el grafo generado: nodos-stub (cantidades, nombres no latinos) y aristas.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const pendingDir = path.join(repoRoot, 'ingredients/pending_review')

const sanitizeId = (t) =>
  String(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
const isLatinText = (t) => /[a-zA-ZÀ-ÿ]/.test(String(t || ''))

// ids que produciría el escáner de ciencia (name || basename)
const sciIds = new Set()
let sinName = 0
for (const f of fs.readdirSync(pendingDir)) {
  if (!f.endsWith('.md')) continue
  const p = path.join(pendingDir, f)
  const fm = matter(fs.readFileSync(p, 'utf8')).data
  if (!fm.name) sinName++
  sciIds.add(`ingredient_${sanitizeId(fm.name || path.basename(p, '.md'))}`)
}
console.log(
  `pending_review: ${fs.readdirSync(pendingDir).filter((f) => f.endsWith('.md')).length} archivos · ${sinName} sin campo "name"`,
)

const d = JSON.parse(fs.readFileSync('public/graph-data.json', 'utf8'))
const nodesInPending = d.nodes.filter((n) => sciIds.has(n.id))
const edgesTouchingPending = d.edges.filter(
  (e) => sciIds.has(e.source) || sciIds.has(e.target),
)
console.log(
  `nodos del grafo que vienen de pending_review: ${nodesInPending.length}`,
)
console.log(`aristas que los tocan: ${edgesTouchingPending.length}`)
console.log('\nejemplos de nodos-stub:')
for (const n of nodesInPending.slice(0, 12))
  console.log(`   ${n.id}  label=${JSON.stringify(n.label)}`)

// patrones de cantidad (stubs típicos)
const qty =
  /^(cucharad|manojo|diente|taza|pizca|puñado|rebanada|tira|hoja|rama|trozo|pedazo|libra|onza|tbsp|tsp|\d)/i
const qtyNodes = d.nodes.filter(
  (n) => n.type === 'ingredient' && qty.test(String(n.label || '')),
)
console.log(
  `\nnodos ingrediente con label tipo cantidad/unidad: ${qtyNodes.length}`,
)
for (const n of qtyNodes.slice(0, 10))
  console.log(`   ${JSON.stringify(n.label)}`)
