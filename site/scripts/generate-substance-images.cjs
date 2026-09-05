const sharp = require('sharp')
const fs = require('node:fs')
const path = require('node:path')

const outDir = path.join(__dirname, '..', 'public', 'images', 'substances')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const substances = [
  ['alicina', 'Alicina', '#9D4EDD'],
  ['capsaicina', 'Capsaicina', '#F94144'],
  ['curcumina', 'Curcumina', '#F9C74F'],
  ['gingerol', 'Gingerol', '#90BE6D'],
  ['piperina', 'Piperina', '#050507'],
  ['licopeno', 'Licopeno', '#F94144'],
  ['quercetina', 'Quercetina', '#FFB703'],
  ['cuminaldehido', 'Cuminaldehído', '#8B5CF6'],
  ['eugenol', 'Eugenol', '#06D6A0'],
  ['anetol', 'Anetol', '#FDE68A'],
  ['timol', 'Timol', '#84CC16'],
  ['carvacrol', 'Carvacrol', '#10B981'],
  ['cafeina', 'Cafeína', '#6B3A2A'],
  ['teobromina', 'Teobromina', '#7C2D12'],
  ['citral', 'Citral', '#FDE047'],
  ['limoneno', 'Limoneno', '#FEF08A'],
  ['mentol', 'Mentol', '#06D6A0'],
  ['apigenina', 'Apigenina', '#F0F9FF'],
  ['resveratrol', 'Resveratrol', '#7C3AED'],
  ['antocianina', 'Antocianina', '#581C87'],
  ['betaina', 'Betaína', '#BEF264'],
  ['sulforafano', 'Sulforafano', '#4ADE80'],
  ['genisteina', 'Genisteína', '#A3A3A3'],
  ['vanilina', 'Vanilina', '#F5F5DC'],
  ['cinamaldehido', 'Cinamaldehído', '#92400E'],
  ['oleocanthal', 'Oleocanthal', '#365314'],
  ['zeaxantina', 'Zeaxantina', '#FACC15'],
  ['dodecenal', 'Dodecenal', '#059669'],
  ['linalool', 'Linalool', '#C4B5FD'],
  ['alil-isotiocianato', 'Alil-ITC', '#DC2626'],
]

async function gen(name, label, color) {
  // 800x600 svg -> jpg + webp
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'>
    <rect width='800' height='600' rx='24' fill='${color}'/>
    <rect x='24' y='24' width='752' height='552' rx='20' fill='none' stroke='rgba(255,255,255,0.25)' stroke-width='2'/>
    <text x='400' y='260' font-family='Inter, sans-serif' font-size='48' font-weight='800' fill='white' text-anchor='middle'>${label}</text>
    <text x='400' y='310' font-family='Inter, sans-serif' font-size='18' font-weight='600' fill='rgba(255,255,255,0.9)' text-anchor='middle'>GOS Substance • 800×600</text>
    <text x='400' y='340' font-family='monospace' font-size='14' fill='rgba(255,255,255,0.75)' text-anchor='middle'>public/images/substances/${name}.jpg</text>
    <circle cx='400' cy='150' r='44' fill='rgba(255,255,255,0.22)'/>
    <text x='400' y='168' font-family='Inter' font-size='36' text-anchor='middle' fill='white'>⚗️</text>
  </svg>`
  const jpg = path.join(outDir, `${name}.jpg`)
  const webp = path.join(outDir, `${name}.webp`)
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(jpg)
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(webp)
  console.log(`✅ ${name}`)
}

;(async () => {
  for (const [n, l, c] of substances) {
    await gen(n, l, c)
  }
  const files = fs.readdirSync(outDir)
  console.log(`Done: ${files.length} files in ${outDir}`)
  console.log(files.slice(0, 5).join(', '))
})()
