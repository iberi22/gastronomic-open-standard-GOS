// site/src/lib/recipe-instructions.test.ts
//
// El caso que importa: 495/495 recetas emitian JSON-LD sin
// recipeInstructions (auditoria 2026-10-01). Estos tests fijan que el parser
// extrae los pasos de dishes/*.md y que NO inventa pasos donde no los hay.
import { describe, expect, it } from 'vitest'
import {
  extractInstructionSteps,
  extractInstructionTexts,
} from './recipe-instructions'

describe('extractInstructionSteps', () => {
  it('extrae la lista numerada de la sección Instrucciones', () => {
    const md = [
      '## 👨‍🍳 Instrucciones',
      '',
      '1. **Preparar la yuca:** Pela, ralla y exprime la yuca amarga.',
      '2. **Fermentar:** Mezcla con agua y deja reposar.',
      '3. Cocinar a fuego lento.',
    ].join('\n')

    const pasos = extractInstructionSteps(md)
    expect(pasos).toHaveLength(3)
    expect(pasos[0]).toEqual({
      position: 1,
      text: 'Preparar la yuca: Pela, ralla y exprime la yuca amarga.',
    })
    expect(pasos[2].text).toBe('Cocinar a fuego lento.')
  })

  it('acepta el punto y el paréntesis como separador', () => {
    const md = '## Instrucciones\n\n1) Primero\n2) Segundo'
    expect(extractInstructionTexts(md)).toEqual(['Primero', 'Segundo'])
  })

  it('limpia el markdown inline del paso', () => {
    const md =
      '## Instrucciones\n\n1. Usa **sal** y [pimienta](https://x.test) con `fuego`.'
    expect(extractInstructionTexts(md)).toEqual([
      'Usa sal y pimienta con fuego.',
    ])
  })

  it('se detiene en la siguiente sección de igual nivel', () => {
    const md = [
      '## Instrucciones',
      '1. Paso real',
      '',
      '## Notas',
      '2. Este NO es un paso',
    ].join('\n')
    expect(extractInstructionTexts(md)).toEqual(['Paso real'])
  })

  it('devuelve vacío sin sección Instrucciones', () => {
    expect(extractInstructionSteps('## Título\n\n1. Orphan')).toEqual([])
  })

  it('devuelve vacío si la sección no tiene lista numerada', () => {
    // Texto corrido: es preferible omitir el campo a emitirlo como pasos.
    const md = '## Instrucciones\n\nMezclar todo bien y cocinar.'
    expect(extractInstructionSteps(md)).toEqual([])
  })

  it('no se rompe con entrada vacía o sin markdown', () => {
    expect(extractInstructionSteps('')).toEqual([])
    expect(extractInstructionSteps('texto plano sin headings')).toEqual([])
  })

  it('reinicia la numeración aunque el markdownNumero mal', () => {
    // 1. 5. 9. -> position debe ser 1, 2, 3 (HowToStep.position es correlativo)
    const md = '## Instrucciones\n\n1. Uno\n5. Cinco\n9. Nueve'
    expect(extractInstructionSteps(md).map((s) => s.position)).toEqual([
      1, 2, 3,
    ])
  })
})
