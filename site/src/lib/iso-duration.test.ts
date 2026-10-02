import { describe, expect, it } from 'vitest'
import { toIsoDuration } from './iso-duration'

/**
 * El bug que estos tests cubren: el sitio emitia
 * `PT${texto.replace(/\D/g,'')}M`, que concatena los numeros del texto.
 * Medido sobre formatos reales del repo, 6 de 6 salian mal.
 *
 * La asercion clave es que NINGUN caso puede dar PT2M para "2 horas": ese
 * fue el fallo mas silencioso, porque un numero pequeno parece valido.
 */
describe('toIsoDuration', () => {
  it('convierte los formatos que el repo usa de verdad', () => {
    // [entrada, esperado] — tomados de site/src/content/dishes/
    const casos: [string, string | undefined][] = [
      ['45 minutos', 'PT45M'],
      ['30 min', 'PT30M'],
      ['2 horas y 30 minutos', 'PT2H30M'],
      ['1 hora 15 minutos', 'PT1H15M'],
      ['2 horas', 'PT2H'],
      ['1 hora', 'PT1H'],
      ['90 minutos', 'PT1H30M'],
      ['1h 30min', 'PT1H30M'],
      ['15 min', 'PT15M'],
    ]
    for (const [entrada, esperado] of casos) {
      expect(toIsoDuration(entrada), entrada).toBe(esperado)
    }
  })

  it('NUNCA convierte "2 horas" en PT2M (la regresion original)', () => {
    // Si esto pasa, el numero se esta concatenando en vez de interpretarse.
    expect(toIsoDuration('2 horas')).not.toBe('PT2M')
    expect(toIsoDuration('3 horas')).not.toBe('PT3M')
    expect(toIsoDuration('4 horas')).not.toBe('PT4M')
  })

  it('un rango toma el extremo inferior, no la concatenacion', () => {
    // "10-15 minutos" daba PT1015M (1015 minutos). Se toma el primero.
    expect(toIsoDuration('10-15 minutos')).toBe('PT10M')
    expect(toIsoDuration('10-15 minutos')).not.toBe('PT1015M')
  })

  it('omite el campo cuando no hay nada interpretable', () => {
    // Preferible no emitir duracion a emitir una falsa.
    for (const v of ['', '   ', 'a ojo', 'sin tiempo', undefined, null]) {
      expect(toIsoDuration(v as string | undefined)).toBeUndefined()
    }
  })

  it('nunca devuelve PT0M ni una duracion vacia', () => {
    for (const v of ['0 minutos', '0 min', '0 horas', 'x 0 y']) {
      const r = toIsoDuration(v)
      expect(r, v).not.toBe('PT0M')
      if (r !== undefined) expect(r.length, v).toBeGreaterThan(3)
    }
  })

  it('la salida siempre cumple el patron ISO 8601', () => {
    const entradas = [
      '45 minutos',
      '2 horas',
      '2 horas y 30 minutos',
      '1h 15min',
      '90 minutos',
      '1 día',
      '30 seg',
      '10-15 minutos',
    ]
    for (const e of entradas) {
      const r = toIsoDuration(e)
      if (r === undefined) continue
      expect(r, e).toMatch(/^PT(\d+H)?(\d+M)?$/)
      expect(r, e).not.toMatch(/PT0M$/)
    }
  })

  it('regresion: la concatenacion de digitos esta prohibida', () => {
    // Property test: para cualquier texto con dos numeros separados, el
    // resultado NO puede ser la concatenacion de ambos.
    const conDos = ['1 hora 30 minutos', '2 horas 45 minutos', '3 h 20 min']
    for (const e of conDos) {
      const digitos = e.replace(/\D/g, '')
      const r = toIsoDuration(e)
      expect(r, e).not.toBe(`PT${digitos}M`)
    }
  })
})
