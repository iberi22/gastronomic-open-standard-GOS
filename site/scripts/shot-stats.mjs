// /tmp/shot-stats.mjs — mide la cobertura de "tinta" (píxeles oscuros) de un PNG
import sharp from 'sharp'

const files = process.argv.slice(2)
for (const f of files) {
  try {
    const img = sharp(f)
    const { width, height } = await img.metadata()
    const raw = await img.raw().toBuffer()
    const ch = raw.length / (width * height)
    let dark = 0
    for (let i = 0; i < raw.length; i += ch) {
      const v = raw[i] // canal R (gris ~ igual en R/G/B)
      if (v < 215) dark++
    }
    console.log(
      `${f.split('/').pop().padEnd(46)} ${width}x${height} ink=${((100 * dark) / (width * height)).toFixed(2)}%`,
    )
  } catch (e) {
    console.log(`${f}: ERR ${e.message}`)
  }
}
