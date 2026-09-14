// scripts/crop-stats.mjs — mide contraste real (percentiles de gris) de una región de un PNG
// uso: node scripts/crop-stats.mjs <png> <x1> <y1> <x2> <y2> <etiqueta>
import sharp from 'sharp'

const [file, x1, y1, x2, y2, label] = process.argv.slice(2)
const img = sharp(file)
const { width, height } = await img.metadata()
const region = { left: +x1, top: +y1, width: +x2 - +x1, height: +y2 - +y1 }
const raw = await img.extract(region).greyscale().raw().toBuffer()
const vals = Array.from(raw).sort((a, b) => a - b)
const p = (q) => vals[Math.min(vals.length - 1, Math.floor(vals.length * q))]
console.log(
  `${label.padEnd(20)} min=${String(vals[0]).padStart(3)} p1=${String(p(0.01)).padStart(3)} p5=${String(p(0.05)).padStart(3)} mediana=${String(p(0.5)).padStart(3)}  (recorte ${region.width}x${region.height} de ${width}x${height})`,
)
