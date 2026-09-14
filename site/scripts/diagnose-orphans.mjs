// scripts/diagnose-orphans.mjs — encuentra los ids referenciados por aristas que
// no existen como nodos (el generador los poda en silencio).
import fs from 'node:fs'

const d = JSON.parse(fs.readFileSync('public/graph-data.json', 'utf8'))
const ids = new Set(d.nodes.map((n) => n.id))
const missing = new Map()
for (const e of d.edges) {
  for (const end of [e.source, e.target]) {
    if (!ids.has(end)) missing.set(end, (missing.get(end) || 0) + 1)
  }
}
console.log('shape del archivo:', Object.keys(d).join(', '))
console.log('nodos:', d.nodes.length, ' aristas:', d.edges.length)
console.log('ids faltantes referenciados por aristas:', missing.size)
for (const [id, n] of [...missing.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(5)} aristas → ${JSON.stringify(id)}`)
}
// ¿hay nodos con ids parecidos (mismo prefijo) en el grafo?
const sample = [...missing.keys()][0]
if (sample) {
  const prefix = sample.split('_')[0]
  const parecidos = d.nodes
    .filter(
      (n) => n.id.startsWith(prefix + '_') && n.id.length < sample.length + 8,
    )
    .slice(0, 10)
  console.log(`\nnodos con prefijo "${prefix}_" (muestra):`)
  for (const n of parecidos)
    console.log(`   ${JSON.stringify(n.id)}  label=${JSON.stringify(n.label)}`)
}
