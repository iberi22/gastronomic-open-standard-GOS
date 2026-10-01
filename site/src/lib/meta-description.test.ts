import { describe, expect, it } from 'vitest'
import {
  clampDescription,
  countryDescription,
  DESC_MAX,
  ingredientDescription,
  isDescriptionLength,
  recipeDescription,
  recipeIndexDescription,
  substanceDescription,
} from './meta-description'

// El rango 120-158 es el contrato SEO que reemplazo al boilerplate que
// comparten 576 paginas. Estos tests son la red que lo sostiene.
describe('clampDescription', () => {
  it('colapsa espacios y deja el texto intacto si ya cabe', () => {
    expect(clampDescription('  hola   mundo  ')).toBe('hola mundo')
  })

  it('recorta en frontera de palabra y nunca excede DESC_MAX', () => {
    const long = 'palabra '.repeat(60).trim()
    const out = clampDescription(long)
    expect(out.length).toBeLessThanOrEqual(DESC_MAX)
    expect(out.endsWith('…')).toBe(true)
    // Recorta en frontera: no debe quedar una palabra partida a la mitad.
    expect(out).not.toMatch(/palab…$/)
  })
})

describe('ingredientDescription', () => {
  it('usa los datos nutricionales reales cuando existen', () => {
    const d = ingredientDescription({
      name: 'Limón',
      group: 'Fruit',
      nutrition: { calories: 30, protein_g: 0.7, fiber_g: 2.8 },
    })
    expect(d).toContain('30 kcal')
    expect(d).toContain('2.8 g de fibra')
    // '0 kcal' es subcadena de '30 kcal': hay que aislar el cero.
    expect(d).not.toMatch(/(?<!\d)0 kcal/)
    expect(d).not.toMatch(/(?<!\d)0\.0 g/)
  })

  it('no invierte nutricion cuando los valores son 0 (pending_review real)', () => {
    // El frontmatter de pending_review trae TODas las nutrientes en 0.
    const d = ingredientDescription({
      name: 'Papas',
      group: 'Uncategorized',
      nutrition: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 },
      pendingReview: true,
    })
    expect(d).not.toContain('kcal')
    expect(d).not.toContain('0 g')
    expect(d).toContain('revision')
  })

  it('descarta el 0 en la ruta normal, sin depender de pendingReview', () => {
    // El test de arriba pasa por el early-return de Uncategorized, asi que
    // nunca llega a num(). Este caso es el que protege num() de verdad:
    // grupo con taxonomia valida y nutrientes en cero.
    //
    // Control negativo: cambiar num() a `Number.isFinite(n)` (quitando el
    // `n > 0`) hacia aparecer "0 kcal" y este test caia. Con el `n > 0`
    // puesto pasa. Comprobado.
    const d = ingredientDescription({
      name: 'Ajo',
      group: 'Condiment',
      nutrition: { calories: 0, protein_g: 0, fiber_g: 0 },
    })
    expect(d).not.toMatch(/(?<!\d)0 kcal/)
    expect(d).not.toMatch(/(?<!\d)0(\.0)? g/)
    // y aun asi cumple el rango de longitud
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })

  it('conserva el valor real cuando es mayor que cero', () => {
    // Contrapeso del anterior: num() no debe descartar numeros legitimos.
    const d = ingredientDescription({
      name: 'Ajo',
      group: 'Condiment',
      nutrition: { calories: 149, protein_g: 6.4, fiber_g: 2.1 },
    })
    expect(d).toContain('149 kcal')
    expect(d).toContain('6.4 g de proteina')
  })

  it('pending_review no repite la palabra ingrediente', () => {
    const d = ingredientDescription({
      name: 'Papas',
      group: 'Uncategorized',
      pendingReview: true,
    })
    expect(d).not.toContain('ingrediente ingrediente')
  })

  it('cae en 120-158 para todas las formas de entrada', () => {
    const cases = [
      { name: 'Ajo', group: 'Condiment', nutrition: { calories: 149 } },
      { name: 'Sal', group: 'Condiment', nutrition: {} },
      { name: 'Aceite', group: 'Oil', nutrition: { calories: 884 } },
      { name: 'Queso', group: 'Dairy', nutrition: { calories: 402 } },
      { name: 'X', group: 'Uncategorized', pendingReview: true },
    ]
    for (const c of cases) {
      const d = ingredientDescription(c)
      expect(isDescriptionLength(d), `${c.name} => ${d.length}: ${d}`).toBe(
        true,
      )
    }
  })

  it('cae en rango con condicion del registro de salud', () => {
    const d = ingredientDescription({
      name: 'Limón',
      group: 'Fruit',
      nutrition: { calories: 30 },
      conditions: ['Iron Deficiency Anemia'],
    })
    expect(d).toContain('anemia por deficiencia de hierro')
    expect(isDescriptionLength(d)).toBe(true)
  })
})

describe('countryDescription', () => {
  it('incluye el conteo real de recetas', () => {
    const d = countryDescription({
      name: 'Colombia',
      region: 'Andina',
      recipeCount: 184,
      highlights: ['sabroso'],
    })
    expect(d).toContain('Colombia')
    expect(d).toContain('184 recetas')
    expect(isDescriptionLength(d)).toBe(true)
  })

  it('usa singular para un solo plato', () => {
    const d = countryDescription({
      name: 'X',
      region: 'Nacional',
      recipeCount: 1,
    })
    expect(d).toContain('1 receta')
    expect(d).not.toContain('1 recetas')
  })
})

describe('index descriptions', () => {
  it('recipeIndexDescription cae en rango con conteos grandes', () => {
    for (const n of [1, 495, 1104, 12000]) {
      const d = recipeIndexDescription(n)
      expect(isDescriptionLength(d), `${n} => ${d.length}`).toBe(true)
    }
  })
})

describe('redaccion de unidades y repeticiones', () => {
  it('no duplica la unidad cuando la clave ya la trae', () => {
    const d = ingredientDescription({
      name: 'Ajo',
      group: 'Condiment',
      nutrition: { calories: 149, protein_g: 6.4, fiber_g: 2.1 },
      conditions: ['Hypertension'],
      micronutrients: { manganese_mg: 1.7 },
    })
    expect(d).toContain('manganese mg')
    expect(d).not.toMatch(/\d(\.\d+)? mg de \w+ mg/)
  })

  it('no repite el nombre del pais cuando la region es el pais', () => {
    const d = countryDescription({
      name: 'Colombia',
      region: 'Colombia',
      recipeCount: 122,
    })
    expect(d).not.toContain('recetas de Colombia')
    expect(isDescriptionLength(d)).toBe(true)
  })

  it('conserva la region cuando es distinta del pais', () => {
    const d = countryDescription({
      name: 'Colombia',
      region: 'Andina / Caribe',
      recipeCount: 122,
    })
    expect(d).toContain('Andina / Caribe')
  })
})

describe('substanceDescription', () => {
  it('reusa formula, origen, beneficio y sazon', () => {
    const d = substanceDescription({
      name: 'Cuminaldehído',
      formula: 'C10H12O',
      benefit: 'Digestivo, carminativo',
      sazon: 'Térreo cálido',
      sourceIngredient: 'comino',
    })
    expect(d).toContain('C10H12O')
    expect(d).toContain('comino')
    expect(d).toContain('Digestivo')
    expect(isDescriptionLength(d)).toBe(true)
  })

  it('no queda corta cuando solo hay nombre', () => {
    const d = substanceDescription({ name: 'Genisteína' })
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })
})

describe('recipeDescription', () => {
  it('usa pais y region reales, no texto generico', () => {
    const d = recipeDescription({
      name: 'Ají Negro',
      country: 'Colombia',
      region: 'Amazonía',
      category: 'Salsa',
      flavors: ['Picante', 'Ácido', 'Umami'],
    })
    expect(d).toContain('Colombia')
    expect(d).toContain('Amazonía')
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })

  it('no pega dos frases cuando un campo falta', () => {
    // Con category Y flavors presentes, el `${head} ${tipo}${sabores}` sin
    // filtro daba "Plato de salsa.Sabores: ...". Con category y SIN flavors
    // no se reproducia, asi que el caso tiene que traer los dos campos.
    const d = recipeDescription({
      name: 'Ají Negro',
      country: 'Colombia',
      category: 'Salsa',
      flavors: ['Picante', 'Ácido', 'Umami'],
    })
    expect(d).not.toMatch(/\.\w/) // ningun punto seguido de letra
    expect(d).not.toContain('.Sabores')
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })

  it('no repite una frase de relleno aunque no quepa la siguiente', () => {
    // La rama de desborde de padTo metia fallbacks[0] sin comprobar si ya
    // estaba: en dist/ una pagina salia con "Ficha abierta en el grafo de
    // GOS. Ficha abierta en el grafo de GOS."
    //
    // El caso que lo dispara es ingredientDescription SIN condicion: la cola
    // era FILLER[0] en el texto base y padTo la anadia otra vez. Con solo
    // name+group el texto llega a 155 caracteres con la frase repetida.
    const d = ingredientDescription({
      name: 'Sal (condimento)',
      group: 'Condiment',
    })
    const filler = 'Ficha abierta en el grafo de GOS.'
    const apariciones = d.split(filler).length - 1
    expect(apariciones, d).toBe(1)
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })

  it('nunca excede 158 aunque la entrada sea enorme', () => {
    // El corte por DESC_MIN dentro de padTo es una optimizacion, no la
    // garantia: si se quitara, el texto sigue dentro de rango porque
    // clampDescription lo recorta. Este test fija ese comportamiento para
    // que el recorte aguas abajo no se pueda relajar sin notarlo.
    const d = recipeDescription({
      name: 'Sal (condimento)',
      category: 'C'.repeat(400),
      flavors: ['Picante', 'Ácido', 'Umami'],
      textures: ['Espesa', 'Untuosa'],
      presentation: 'Se usa para sazonar.'.repeat(20),
    })
    expect(d.length, `${d.length}: ${d.slice(0, 60)}`).toBeLessThanOrEqual(
      DESC_MAX,
    )
  })

  it('acepta textura como lista, que es como viene en los datos', () => {
    // 585 de 585 recetas declaran sensory.texture como array. La primera
    // version de recipeDescription llamaba .toLowerCase() sobre ella y el
    // build reventaba con "input.texture.toLowerCase is not a function".
    const d = recipeDescription({
      name: 'Ají Negro',
      country: 'Colombia',
      textures: ['Espesa', 'Untuosa'],
    })
    expect(d).toContain('Textura')
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })

  it('rellena hasta el minimo cuando solo hay nombre y presentacion', () => {
    // El caso que falla si padTo no se usa: con los campos minimos la
    // descripcion se queda muy corta.
    const d = recipeDescription({
      name: 'Sal (condimento)',
      presentation: 'Se usa para sazonar.',
    })
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })

  it('no inventa datos que la receta no declara', () => {
    // Sin pais ni region, no debe colarse el nombre de ningun pais.
    const d = recipeDescription({ name: 'Sal (condimento)' })
    expect(d).not.toMatch(/receta de [A-ZÁÉÍÓÚ]/) // sin lugar inventado
    expect(isDescriptionLength(d), `${d.length}: ${d}`).toBe(true)
  })
})
