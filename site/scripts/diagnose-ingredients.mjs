// scripts/diagnose-ingredients.mjs — lista los archivos de ingredients/ cuyo id
// no puede existir como nodo (sin name latino) y que hoy generan aristas huérfanas.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const ingredientsDir = path.join(repoRoot, 'ingredients')

const sanitizeId = (t) =>
  String(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
const isLatinText = (t) => /[a-zA-ZÀ-ÿ]/.test(String(t || ''))

const rows = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      walk(p)
      continue
    }
    if (!e.isFile() || !e.name.endsWith('.md')) continue
    const fm = matter(fs.readFileSync(p, 'utf8')).data
    const fallback = path.basename(p, '.md')
    const name = fm.name
    const nodeId =
      name && isLatinText(name) ? `ingredient_${sanitizeId(name)}` : null // nodo que SÍ existe
    const sciId = `ingredient_${sanitizeId(name || fallback)}` // id que usa scanIngredientsScience
    if (!nodeId || nodeId !== sciId) {
      rows.push({
        file: path.relative(repoRoot, p),
        name: name === undefined ? '(sin name)' : String(name),
        fallback,
        sciId,
        nodeId: nodeId || '(no se crea)',
        hasScience: !!(
          fm.micronutrients ||
          fm.nutrition_per_100g ||
          fm.active_compounds ||
          fm.treats ||
          fm.health_conditions
        ),
      })
    }
  }
}
walk(ingredientsDir)

console.log(`archivos con desajuste: ${rows.length}`)
for (const r of rows) {
  console.log(`  ${r.file}`)
  console.log(
    `      name=${JSON.stringify(r.name)}  fallback=${JSON.stringify(r.fallback)}`,
  )
  console.log(
    `      id ciencia=${r.sciId}   id nodo=${r.nodeId}   datos científicos=${r.hasScience ? 'SÍ' : 'no'}`,
  )
}
