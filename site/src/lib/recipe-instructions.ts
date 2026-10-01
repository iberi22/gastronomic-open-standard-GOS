// site/src/lib/recipe-instructions.ts — extrae los pasos de una receta desde
// dishes/*.md para el JSON-LD recipeInstructions.
//
// Por que existe: medido 2026-10-01 sobre el build, 495/495 recetas (100%)
// emitian JSON-LD sin recipeInstructions, que es un campo requerido para el
// rich result de receta. El dato NO faltaba: 444/613 dishes tienen la seccion
// "## Instrucciones" con pasos numerados en markdown que nunca se parseaba.
//
// Solo se acepta la lista numerada (1. 2. 3.). Una seccion sin pasos
// enumerados no produce recipeInstructions: es preferible omitir el campo a
// emitir texto corrido como si fueran pasos, porque un rich result invalido
// es peor que ningun rich result.

export interface InstructionStep {
  position: number
  text: string
}

// El heading puede llevar un emoji decorativo delante ("## 👨‍🍳 Instrucciones").
// Se acepta cualquier caracter no alfanumerico antes de la palabra, en vez de
// enumerar rangos unicode (los escapes \u{...} necesitan el flag u, que aqui no
// esta activo).
const INSTRUCTIONS_HEADING = /^#{2,3}\s*[^\p{L}\p{N}]*\s*instrucciones?\s*$/gimu

/** Limpia el markdown inline de un paso: **negrita**, *cursiva*, `code`, [enlace](url). */
function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Devuelve los pasos de la sección Instrucciones de un markdown de receta.
 * Lista vacía si no hay sección o no hay pasos numerados.
 */
export function extractInstructionSteps(markdown: string): InstructionStep[] {
  if (!markdown) return []

  // Aislar el cuerpo de la sección: desde el heading hasta el siguiente ## de
  // igual o mayor nivel, o hasta el final.
  const headings = [...markdown.matchAll(INSTRUCTIONS_HEADING)]
  if (headings.length === 0) return []

  const start = (headings[0].index ?? 0) + headings[0][0].length
  const rest = markdown.slice(start)
  const nextHeading = rest.search(/^#{2,3}\s+/m)
  const body = nextHeading === -1 ? rest : rest.slice(0, nextHeading)

  const steps: InstructionStep[] = []
  let position = 0
  for (const line of body.split('\n')) {
    const m = line.match(/^\s{0,3}(\d+)[.)]\s+(.*\S)\s*$/)
    if (!m) continue
    const text = stripInline(m[1] ? m[2] : (m[1] ?? ''))
    if (!text) continue
    position += 1
    steps.push({ position, text })
  }
  return steps
}

/** Atajo para el JSON-LD: solo los textos, en orden. */
export function extractInstructionTexts(markdown: string): string[] {
  return extractInstructionSteps(markdown).map((s) => s.text)
}
