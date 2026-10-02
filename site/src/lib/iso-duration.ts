/**
 * Convierte un tiempo de receta escrito en texto ("2 horas y 30 minutos",
 * "45 min", "10-15 minutos") a la duracion ISO 8601 que exige schema.org.
 *
 * Por que existe esto: el sitio emitia `PT${texto.replace(/\D/g,'')}M`, que
 * concatena los numeros. Medido sobre los formatos reales del repo:
 *
 *   "2 horas y 30 minutos"  -> PT230M    (3 h 50 min en vez de 2 h 30)
 *   "2 horas"                -> PT2M      (2 MINUTOS en vez de 2 horas)
 *   "10-15 minutos"          -> PT1015M   (1015 minutos)
 *   "45 minutos"             -> PT45M     (este caso sí era correcto)
 *
 * Es decir: el JSON-LD publicado moria sobre el tiempo de practicamente
 * todas las recetas, y es el campo que Google usa para el rich result.
 *
 * Devuelve undefined cuando no hay nada interpretable, para que el campo se
 * omita en vez de emitir una duracion falsa. Emitir "PT0M" o un numero
 * inventado es peor que no emitir el campo.
 */

const UNIDADES_MIN: Record<string, number> = {
  // espanol (el idioma de los .md del repo)
  s: 1 / 60,
  seg: 1 / 60,
  segundo: 1 / 60,
  segundos: 1 / 60,
  m: 1,
  min: 1,
  minuto: 1,
  minutos: 1,
  h: 60,
  hora: 60,
  horas: 60,
  d: 1440,
  dia: 1440,
  días: 1440,
  dias: 1440,
  // ingles (aparecen en algunas fichas importadas)
  second: 1 / 60,
  seconds: 1 / 60,
  sec: 1 / 60,
  minute: 1,
  minutes: 1,
  hour: 60,
  hours: 60,
  hr: 60,
  hrs: 60,
  day: 1440,
  days: 1440,
}

/**
 * Numero + unidad. La unidad es OBLIGATORIA para sumar: sin ella no sabemos
 * si el numero son minutos u horas, y asumir "min" convertia "2 horas" en
 * PT2M. Por eso `2 horas` devuelve undefined en vez de mentir.
 */
const PAR = /(\d+(?:[.,]\d+)?)\s*([a-záéíóúñA-ZÁÉÍÓÚÑ]+)/g

/** Normaliza la unidad: minusculas, sin acentos, sin punto final. */
function normUnidad(u: string): string {
  return u
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\u00b0]/g, '')
}

export function toIsoDuration(
  texto: string | undefined | null,
): string | undefined {
  if (texto === null || texto === undefined) return undefined
  const s = String(texto).toLowerCase().trim()
  if (!s) return undefined

  // Un rango "10-15 minutos" se queda con el extremo inferior. Se elimina
  // el segundo numero ENTERO, no solo el guion: si solo se quita el guion,
  // queda "10 15 minutos" y el 15 hereda la unidad, sumando 10+15=25.
  const sinRango = s.replace(/(\d+)\s*[-–—]\s*\d+\s*/g, '$1 ')

  let totalMin = 0
  for (const m of sinRango.matchAll(PAR)) {
    const n = Number(m[1].replace(',', '.'))
    if (!Number.isFinite(n)) continue
    const factor = UNIDADES_MIN[normUnidad(m[2])]
    if (factor === undefined) continue
    totalMin += n * factor
  }

  if (!(totalMin > 0)) return undefined

  // Se redondea al minuto: una fraccion de segundo no aporta nada al rich
  // result y algunos validadores la rechazan como duracion no valida.
  const mins = Math.round(totalMin)
  if (mins <= 0) return undefined
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `PT${m}M`
  if (m === 0) return `PT${h}H`
  return `PT${h}H${m}M`
}
