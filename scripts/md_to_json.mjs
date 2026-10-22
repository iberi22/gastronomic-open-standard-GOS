#!/usr/bin/env node
import assert from 'node:assert/strict'
// Deterministic Markdown+frontmatter -> JSON converter for the GOS data
// collections (repo-as-database). See docs/DATA-STORAGE.md.
//   node scripts/md_to_json.mjs          convert every .md and delete it
//   node scripts/md_to_json.mjs --check  exit 1 if any .md remains or a JSON is invalid
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'site/package.json'))
const matter = require('gray-matter')

export const COLLECTIONS = [
  'ingredients',
  'vitamins',
  'substances',
  'conditions',
  'mixtures',
  'diets',
]
const contentDir = path.join(root, 'site/src/content')

export function walk(dir, ext) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f))
    .sort()
}

export const toJson = (record) => `${JSON.stringify(record, null, 2)}\n`

export function mdToRecord(raw) {
  const { data, content } = matter(raw)
  const body = content.trim()
  const record = { ...data }
  if (body) record.body_md = body
  return record
}

function convert() {
  let n = 0
  for (const c of COLLECTIONS) {
    for (const file of walk(path.join(contentDir, c), '.md')) {
      const record = mdToRecord(fs.readFileSync(file, 'utf8'))
      const text = toJson(record)
      assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify(record)))
      const parsed = matter(fs.readFileSync(file, 'utf8')).data
      for (const k of Object.keys(parsed))
        assert.deepEqual(
          JSON.parse(text)[k],
          JSON.parse(JSON.stringify(parsed[k])),
          `${file}: key ${k}`,
        )
      fs.writeFileSync(file.replace(/\.md$/, '.json'), text)
      fs.unlinkSync(file)
      n++
    }
  }
  console.log(`converted ${n} files`)
}

async function check() {
  const { z } = await import(pathToFileURL(require.resolve('astro/zod')).href)
  const required = {
    conditions: { name: z.string() },
    diets: { name: z.string() },
    substances: { name: z.string() },
    mixtures: { name: z.string(), ingredients: z.array(z.string()) },
  }
  let bad = 0
  for (const c of COLLECTIONS) {
    const dir = path.join(contentDir, c)
    for (const f of walk(dir, '.md')) {
      console.error(`markdown remains: ${path.relative(root, f)}`)
      bad++
    }
    const schema = z
      .object({ body_md: z.string().optional(), ...(required[c] || {}) })
      .passthrough()
    for (const f of walk(dir, '.json')) {
      try {
        schema.parse(JSON.parse(fs.readFileSync(f, 'utf8')))
      } catch (e) {
        console.error(`invalid: ${path.relative(root, f)}: ${e.message}`)
        bad++
      }
    }
  }
  if (bad) process.exit(1)
  console.log('ok')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) await check()
  else convert()
}
