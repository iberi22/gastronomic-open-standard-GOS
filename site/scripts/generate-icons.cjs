const sharp = require('sharp')
const fs = require('node:fs')
const path = require('node:path')

const svg192 = `<svg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'>
  <rect width='192' height='192' rx='32' fill='#0a0a0f'/>
  <circle cx='96' cy='80' r='40' fill='#e94560'/>
  <path d='M96 130 C60 130 40 150 40 170 L152 170 C152 150 132 130 96 130Z' fill='#e94560'/>
  <circle cx='80' cy='75' r='8' fill='#fff'/>
  <circle cx='112' cy='75' r='8' fill='#fff'/>
</svg>`

const svg512 = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'>
  <rect width='512' height='512' rx='80' fill='#0a0a0f'/>
  <circle cx='256' cy='210' r='110' fill='#e94560'/>
  <path d='M256 340 C160 340 106 400 106 453 L406 453 C406 400 352 340 256 340Z' fill='#e94560'/>
  <circle cx='210' cy='195' r='22' fill='#fff'/>
  <circle cx='302' cy='195' r='22' fill='#fff'/>
</svg>`

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

Promise.all([
  sharp(Buffer.from(svg192)).png().toFile(path.join(iconsDir, 'icon-192.png')),
  sharp(Buffer.from(svg512)).png().toFile(path.join(iconsDir, 'icon-512.png')),
  sharp(Buffer.from(svg192)).png().toFile(path.join(iconsDir, 'icon-192.svg')),
  sharp(Buffer.from(svg512)).png().toFile(path.join(iconsDir, 'icon-512.svg')),
])
  .then(() => console.log('Icons created successfully'))
  .catch((e) => console.error(e))
