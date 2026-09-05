import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'),
)

console.log('=== GOS SITE - DEPENDENCY AUDIT ===\n')
console.log('Looking for unused/non-critical dependencies...\n')

const results = []

for (const [name, version] of Object.entries(pkg.dependencies)) {
  let count = 0
  const searchDirs = [resolve(__dirname, '..', 'src')]

  for (const dir of searchDirs) {
    try {
      const files = getAllFiles(dir)
      for (const file of files) {
        const content = readFileSync(file, 'utf-8')
        if (
          content.includes(`'${name}'`) ||
          content.includes(`"${name}"`) ||
          content.includes(`from '${name}'`) ||
          content.includes(`from "${name}"`) ||
          content.includes(`require('${name}')`) ||
          content.includes(`require("${name}")`)
        ) {
          count++
        }
      }
    } catch {}
  }

  results.push({ name, version, count })
}

results.sort((a, b) => a.count - b.count)

console.log('=== USAGE RESULTS ===\n')
for (const r of results) {
  const status = r.count > 0 ? 'USED' : 'UNUSED'
  const risk =
    r.count === 0
      ? 'HIGH - can remove'
      : r.name === 'sharp'
        ? 'MEDIUM - heavy'
        : r.name === 'd3'
          ? 'MEDIUM - heavy'
          : 'LOW'
  console.log(`${r.name} (${r.version})`)
  console.log(`  Status: ${status} (${r.count} refs)`)
  console.log(`  Risk: ${risk}`)
  console.log('')
}

console.log('\n=== DEV DEPENDENCIES ===\n')
for (const [name] of Object.entries(pkg.devDependencies)) {
  // Tailwind v4 has no tailwind.config.mjs: detect usage via global.css + astro.config
  let used = false
  try {
    const css = readFileSync(
      resolve(__dirname, '..', 'src/styles/global.css'),
      'utf-8',
    )
    const cfg = readFileSync(
      resolve(__dirname, '..', 'astro.config.mjs'),
      'utf-8',
    )
    used = css.includes(name) || cfg.includes(name)
  } catch {}
  console.log(`${name}: ${used ? 'USED' : 'UNUSED'}`)
}

function getAllFiles(dir, files = []) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const path = resolve(dir, entry.name)
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules'
      ) {
        getAllFiles(path, files)
      } else if (entry.isFile() && /\.(astro|ts|js|mjs)$/.test(entry.name)) {
        files.push(path)
      }
    }
  } catch {}
  return files
}
