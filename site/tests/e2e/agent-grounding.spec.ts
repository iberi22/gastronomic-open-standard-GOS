import { expect, test } from '@playwright/test'

// tests/e2e/agent-grounding.spec.ts — el agente de GOS en navegador real.
//
// Existe por un motivo concreto: el grounding estaba "correcto" en los tests
// unitarios y aun así la página renderizaba datos inventados. Dos fallos solo
// se vieron cargando la página de verdad en Chromium:
//
//   1. El índice nunca llegaba a 'ready'. El arranque estaba en un $effect que
//      leía y escribía catalogState: se auto-disparaba, su cleanup cancelaba
//      el fetch en vuelo y el estado se quedaba en 'loading' para siempre.
//      El fetch sí salía (591 KB) y la página nunca llegaba a responder.
//
//   2. La isla renderizaba la respuesta de /api/ai/ask sin revalidarla. Con un
//      endpoint que devolvía "40 mg por 100 g" y "[substance:cafeina-magica]",
//      esos textos aparecían en pantalla como si fueran datos de GOS.
//
// Los dos son imposibles de detectar leyendo el HTML o corriendo vitest, así
// que se comprueban aquí contra la página montada.

/** Espera a que el índice esté listo (o fallido: el test lo Fallara). */
async function waitForCatalog(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('catalog-state')).toHaveAttribute(
    'data-state',
    'ready',
    { timeout: 15_000 },
  )
}

test.describe('Agente GOS — grounding en navegador', () => {
  test('el índice del repo carga y la isla hidrata', async ({ page }) => {
    await page.goto('/agent/')
    await waitForCatalog(page)

    const state = page.getByTestId('catalog-state')
    await expect(state).toContainText('entradas buscables')

    // El input y el botón existen y responden: la isla está viva. El botón
    // está disabled por diseño hasta que hay algo escrito, así que se escribe
    // antes de exigir que habilite.
    await expect(page.locator('#gos-question')).toBeVisible()
    await page.fill('#gos-question', 'alicina')
    await expect(page.locator('button[type=submit]')).toBeEnabled()
  })

  test('tier free responde con el texto literal y cita un slug real', async ({
    page,
  }) => {
    await page.goto('/agent/')
    await waitForCatalog(page)

    await page.fill('#gos-question', 'alicina')
    await page.click('button[type=submit]')

    const answer = page.getByTestId('answer')
    await expect(answer).toHaveAttribute('data-status', 'answered')

    // Sin inferencia en free: el modelo lo dice.
    await expect(page.getByTestId('model')).toContainText('retrieval-free')

    // Y cita el slug real de la sustancia, que es la garantía central.
    const citations = page.getByTestId('citations')
    await expect(citations).toContainText('substance:alicina')

    // El texto mostrado viene del repo, no del modelo.
    await expect(page.getByTestId('answer-text')).toContainText('C6H10OS2')
  })

  test('una consulta que no existe NO produce datos', async ({ page }) => {
    await page.goto('/agent/')
    await waitForCatalog(page)

    // Sin términos que existan en el catálogo. No se usa "beneficios" porque
    // sí aparece en recetas reales (colombian/.../garulla), y el matching por
    // substring del tier free lo encontraría: el test comprobaba una cosa que
    // no era.
    await page.fill('#gos-question', 'xqjxvb kwyvbn zzzzq')
    await page.click('button[type=submit]')

    await expect(page.getByTestId('answer')).toHaveAttribute(
      'data-status',
      'no-sources',
    )
    await expect(page.getByTestId('citations')).toHaveCount(0)
  })

  test('tier socio con crédito agotado lo explica y no se rompe', async ({
    page,
  }) => {
    await page.goto('/agent/')
    await waitForCatalog(page)

    // Llena el ledger hasta el límite de socio (50000), el mismo key que lee
    // llmComplete(): `credits:{appId}:{tier}`.
    await page.evaluate(() => {
      localStorage.setItem('credits:gos:socio', '50000')
    })
    await page.reload()
    await waitForCatalog(page)

    // Cambia a tier socio.
    await page.locator('input[name=gos-tier][value=socio]').check()
    await expect(page.getByTestId('credit-meter')).toContainText('50000')

    await page.fill('#gos-question', 'alicina')
    await page.click('button[type=submit]')

    await expect(page.getByTestId('answer')).toHaveAttribute(
      'data-status',
      'credit-exhausted',
    )
    // Explica el motivo y ofrece la salida, no se queda mudo ni lanza.
    await expect(page.getByTestId('answer-text')).toContainText(/agotado/i)
    await expect(page.getByTestId('answer-text')).toContainText(/tier free/i)
    await expect(page.getByTestId('citations')).toHaveCount(0)

    // Y la página sigue viva: se puede volver a preguntar.
    await expect(page.locator('button[type=submit]')).toBeEnabled()
  })

  test('si el endpoint devuelve texto sin fuentes, la página NO lo publica', async ({
    page,
  }) => {
    await page.goto('/agent/')
    await waitForCatalog(page)

    // Intercepta /api/ai/ask con una respuesta que un Workers AI podría
    // devolver si ignora el prompt: cifras y citas que no existen.
    await page.route('**/api/ai/ask', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            status: 'answered',
            answer:
              'La alicina tiene 40 mg por 100 g y cura la hipertension con 200 mg diarios. ' +
              'TambienPrevieneElCancer segun [substance:cafeina-magica] y [recipe:inventada/xxx].',
            citations: [
              { kind: 'substance', id: 'cafeina-magica', label: 'Falsa' },
            ],
            consulted: [],
            model: 'llama-3-8b',
            via: 'cf',
          },
        }),
      }),
    )

    await page.evaluate(() => {
      localStorage.setItem('credits:gos:socio', '10')
    })
    await page.locator('input[name=gos-tier][value=socio]').check()
    await page.fill('#gos-question', 'alicina')
    await page.click('button[type=submit]')

    // Lo importante: el texto inventado NO está en pantalla.
    const texto = await page.getByTestId('answer-text').innerText()
    expect(texto).not.toContain('40 mg')
    expect(texto).not.toContain('cura la hipertension')

    // Y el usuario recibe el texto real del repo, con su cita.
    await expect(page.getByTestId('citations')).toContainText(
      'substance:alicina',
    )
    await expect(page.getByTestId('model')).toContainText('retrieval-free')
  })

  test('si el endpoint devuelve texto con citas reales, se acepta', async ({
    page,
  }) => {
    await page.goto('/agent/')
    await waitForCatalog(page)

    await page.route('**/api/ai/ask', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            status: 'answered',
            answer:
              'La alicina se descubrió en 1944 y procede del ajo. [substance:alicina]',
            citations: [{ kind: 'substance', id: 'alicina', label: 'Alicina' }],
            consulted: [],
            model: 'llama-3-8b',
            via: 'cf',
          },
        }),
      }),
    )

    await page.evaluate(() => {
      localStorage.setItem('credits:gos:socio', '10')
    })
    await page.locator('input[name=gos-tier][value=socio]').check()
    await page.fill('#gos-question', 'alicina')
    await page.click('button[type=submit]')

    await expect(page.getByTestId('answer')).toHaveAttribute(
      'data-status',
      'answered',
    )
    await expect(page.getByTestId('model')).toContainText('llama-3-8b')
    await expect(page.getByTestId('answer-text')).toContainText('1944')
    await expect(page.getByTestId('citations')).toContainText(
      'substance:alicina',
    )
  })

  test('la página degrada sin romperse si /api/ai/ask no existe (405)', async ({
    page,
  }) => {
    await page.goto('/agent/')
    await waitForCatalog(page)

    // Reproduce el deploy estático real: sin runtime de servidor, el POST no
    // tiene handler. Es el caso normal en Cloudflare Pages, no un fallo.
    await page.route('**/api/ai/ask', (route) =>
      route.fulfill({ status: 405, body: '' }),
    )

    await page.fill('#gos-question', 'alicina')
    await page.click('button[type=submit]')

    // Responde igual, con la ruta local.
    await expect(page.getByTestId('answer')).toHaveAttribute(
      'data-status',
      'answered',
    )
    await expect(page.getByTestId('model')).toContainText('retrieval-free')
    await expect(page.getByTestId('citations')).toContainText(
      'substance:alicina',
    )
    // Y explica por qué no usó el endpoint, sin quejarse al usuario.
    await expect(page.getByTestId('endpoint-note')).toContainText(/405/)
  })
})
