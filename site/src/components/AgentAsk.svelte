<script lang="ts">
// site/src/components/AgentAsk.svelte — consulta al agente de GOS.
//
// La regla del componente es una: nunca muestra una afirmación que no venga
// con su slug. El texto se arma con askGrounded(), que ya descarta lo que no
// tiene cita válida; aquí solo se renderiza y se hace visible el motivo si la
// respuesta fue rechazada.
//
// El deploy de GOS es output:'static', sin adapter: /api/ai/ask no existe en
// producción y devuelve 405 (medido). Por eso el componente trae TODAS las
// entradas del repo y resuelve en el navegador con el mismo queryTerms()/
// rankEntries() del endpoint. Si algún día hay SSR, llama al endpoint primero
// y cae a la ruta local si falla. La página nunca se rompe por el endpoint.

import { onMount, untrack } from 'svelte'
import {
  askGrounded,
  type CatalogEntry,
  type GosSource,
  type GroundedAnswer,
  queryTerms,
  rankEntries,
  resolveCitations,
  unsupportedClaims,
} from '../lib/llm'

interface Props {
  /** URL del catálogo prerenderizado. Vacío = sin índice (solo endpoint). */
  catalogUrl?: string
  /** Entradas ya disponibles: si se pasan, no se descarga el catálogo. */
  entries?: CatalogEntry[]
  defaultQuestion?: string
  suggestions?: string[]
}

let {
  catalogUrl = '',
  entries: initialEntries,
  defaultQuestion = '',
  suggestions = [],
}: Props = $props()

let question = $state(defaultQuestion)
let answer = $state<GroundedAnswer | null>(null)
let busy = $state(false)
let transport = $state<'local' | 'endpoint' | null>(null)
let endpointNote = $state('')

/**
 * Índice de entradas, cargado una vez desde catalogUrl.
 *
 * El arranque va en `onMount` y NO en un `$effect` a propósito. Un `$effect`
 * que lee y escribe `catalogState` se auto-dispara: al escribir 'loading'
 * invalida sus propias dependencias, vuelve a correr, y su `cleanup` cancela el
 * fetch en vuelo. Se queda en 'loading' para siempre — que es exactamente lo
 * que se veía en el navegador real: la petición salía (591 KB) y la promesa
 * moría en el cleanup, sin llegar a actualizar el estado.
 *
 * `untrack` mantiene el resto del estado fuera de la reactividad: el effect
 * depende solo de catalogUrl.
 */
let catalog = $state<CatalogEntry[]>(initialEntries ?? [])
let catalogState = $state<'idle' | 'loading' | 'ready' | 'failed'>(
  initialEntries?.length ? 'ready' : 'idle',
)
let catalogCount = $state(initialEntries?.length ?? 0)

onMount(() => {
  if (!catalogUrl || catalog.length) return
  catalogState = 'loading'
  fetch(catalogUrl)
    .then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
    )
    .then((body: { entries?: CatalogEntry[] }) => {
      const list = Array.isArray(body?.entries) ? body.entries : []
      catalog = list
      catalogCount = list.length
      catalogState = list.length ? 'ready' : 'failed'
    })
    .catch((e) => {
      // Sin índice la página sigue viva: la consulta por /api/ai/ask aún puede
      // funcionar si hay runtime de servidor.
      console.warn('[agent] catalogo no disponible', e)
      catalogState = 'failed'
    })
})

/**
 * Espera a que el catálogo termine de cargar, con techo para no colgar la UI.
 * Consulta un $state desde un bucle async, así que va en untrack.
 */
async function waitForCatalog(timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (untrack(() => catalogState) === 'loading' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 40))
  }
  if (untrack(() => catalogState) === 'loading') catalogState = 'failed'
}

/** Fuentes de la pregunta, con el mismo matching que usa el endpoint. */
function findSources(q: string): GosSource[] {
  const terms = queryTerms(q)
  if (!terms.length || !catalog.length) return []
  const ranked = rankEntries(
    catalog.map((e) => ({ id: e.id, haystack: e.haystack })),
    terms,
  )
  const byId = new Map(catalog.map((e) => [e.id, e]))
  return ranked
    .slice(0, 6)
    .map((r) => byId.get(r.id))
    .filter((e): e is CatalogEntry => Boolean(e))
    .map((e) => ({
      kind: e.kind,
      id: e.id,
      label: e.label,
      url: e.url,
      snippet: e.snippet,
      fields: e.fields,
    }))
}

/** Lanza la consulta de un ejemplo: rellena el input y consulta. */
function askExample(ex: string) {
  question = ex
  return ask()
}

async function ask() {
  const q = question.trim()
  if (!q || busy) return
  busy = true
  answer = null
  transport = null
  endpointNote = ''
  try {
    // El catálogo se descarga al montar, pero el usuario puede escribir antes.
    // Consultar sin índice daría "no encontré nada" falso, así que se espera.
    if (catalogState === 'idle' || catalogState === 'loading') {
      await waitForCatalog()
    }

    // 1. Endpoint si hay runtime de servidor. Un 405/404 aquí es el caso
    //    normal del deploy estático, no un fallo: se anota y se sigue.
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    }).catch(() => null)

    if (res?.ok) {
      const body = (await res.json().catch(() => null)) as {
        data?: GroundedAnswer
      } | null
      if (body?.data) {
        // El endpoint se revalida aquí con las MISMAS reglas. Confiar en que ya
        // filtró es un agujero: si /api/ai/ask devuelve texto con citas que no
        // existen en el catálogo (un Workers AI que ignoró el prompt, o un
        // endpoint mal desplegado), la página lo mostraría tal cual. Medido en
        // navegador: así entraban "40 mg por 100 g" y "[substance:cafeina-magica]".
        //
        // No se revalida volviendo a pedir la respuesta al endpoint: la
        // comprobación es directa sobre el texto que devolvió, contra las
        // fuentes que ya tenemos en el catálogo.
        const sources = findSources(q)
        const { valid, unknownKeys } = resolveCitations(
          body.data.answer,
          sources,
        )
        const validKeys = valid.map((s) => `${s.kind}:${s.id}`.toLowerCase())
        const bad = unsupportedClaims(body.data.answer, validKeys)

        if (valid.length && !bad.length) {
          // Respuesta del endpoint, revalidada y limpia: se publica.
          answer = {
            ...body.data,
            citations: valid,
            reason: unknownKeys.length
              ? `citas desconocidas descartadas: ${unknownKeys.join(', ')}`
              : body.data.reason,
          }
          transport = 'endpoint'
          busy = false
          return
        }

        // No hay respaldo publicable: se dice por qué y se responde con el
        // texto literal del repo, que sí es verificable por construcción.
        endpointNote = !valid.length
          ? `La respuesta de /api/ai/ask citaba fuentes que no existen en GOS ` +
            `(${unknownKeys.slice(0, 3).join(', ') || 'sin marcador'}) y no se publica. ` +
            `Se responde con el texto literal del repo.`
          : `La respuesta de /api/ai/ask tenía ${bad.length} afirmación(es) sin fuente ` +
            `y no se publica íntegra. Se responde con el texto literal del repo.`
        // El fallback es recuperación pura del repo: verificable por
        // construcción, sin pasar por ningún modelo.
        answer = await askGrounded({
          question: q,
          sources,
        })
        transport = 'local'
        busy = false
        return
      }
    }
    if (res) {
      endpointNote =
        res.status === 405 || res.status === 404
          ? 'El sitio se sirve como estático: /api/ai/ask no tiene runtime de servidor (405). La respuesta sale de las fuentes del repo en el navegador, que es el mismo resultado con las mismas reglas de citación.'
          : `El endpoint respondió ${res.status}; se resuelve con las fuentes locales.`
    } else {
      endpointNote =
        'No se pudo contactar /api/ai/ask (sin red o sin runtime). Se resuelve con las fuentes locales.'
    }

    // 2. Ruta local: mismo askGrounded, mismas reglas.
    answer = await askGrounded({
      question: q,
      sources: findSources(q),
    })
    transport = 'local'
  } catch (e) {
    // Última barrera: ni el endpoint ni el matching launched pueden tumbar la
    // página. Se muestra el error y se ofrece el modo lectura.
    answer = {
      status: 'no-sources',
      answer:
        'La consulta falló (' +
        (e instanceof Error ? e.message : String(e)) +
        '). No se ha afirmado nada. Puedes seguir leyendo el repo con la búsqueda de arriba.',
      citations: [],
      consulted: [],
      model: 'error',
      reason: 'client-exception',
    }
    transport = 'local'
  } finally {
    busy = false
  }
}

const STATUS_UI: Record<
  GroundedAnswer['status'],
  { label: string; cls: string; hint: string }
> = {
  answered: {
    label: 'Respondido con fuentes',
    cls: 'ok',
    hint: 'Cada dato citado apunta a una entrada real del repo.',
  },
  ungrounded: {
    label: 'Sin fuente verificable',
    cls: 'warn',
    hint: 'La respuesta del modelo se descartó: no citaba una entrada real de GOS.',
  },
  'no-sources': {
    label: 'Sin coincidencias',
    cls: 'warn',
    hint: 'Ningún título, ingrediente o sustancia del repo coincide con la consulta.',
  },
}

const EXAMPLES = $derived(
  suggestions.length
    ? suggestions
    : ['¿Qué es la alicina?', 'achiras', 'vitamina A', 'beneficios del ajo'],
)
</script>

<section class="ask" aria-labelledby="ask-title">
  <header class="head">
    <h2 id="ask-title">Pregunta al agente de GOS</h2>
    <p class="sub">
      El agente responde solo con lo que hay en el repo y cita la entrada de la
      que lo saca. Si no encuentra la fuente, dice que no lo sabe.
    </p>
    {#if catalogUrl}
      <p class="index-state" data-testid="catalog-state" data-state={catalogState}>
        {#if catalogState === 'loading'}
          Cargando índice del repo…
        {:else if catalogState === 'ready'}
          Índice listo: {catalogCount} entradas buscables.
        {:else if catalogState === 'failed'}
          Índice no disponible. La consulta seguirá por /api/ai/ask si hay
          servidor.
        {:else}
          Índice pendiente.
        {/if}
      </p>
    {/if}
  </header>

  <form
    class="form"
    onsubmit={(e) => {
      e.preventDefault()
      ask()
    }}
  >
    <label class="sr" for="gos-question">Tu pregunta</label>
    <input
      id="gos-question"
      class="input"
      type="text"
      bind:value={question}
      placeholder="achiras, alicina, vitamina A…"
      maxlength="500"
      autocomplete="off"
      disabled={busy}
    />
    <button class="btn" type="submit" disabled={busy || !question.trim()}>
      {busy ? 'Consultando…' : 'Consultar'}
    </button>
  </form>

  <ul class="examples">
    {#each EXAMPLES as ex (ex)}
      <li>
        <button class="chip" type="button" onclick={() => askExample(ex)}>{ex}</button>
      </li>
    {/each}
  </ul>

  {#if endpointNote}
    <p class="note" data-testid="endpoint-note">{endpointNote}</p>
  {/if}

  {#if answer}
    <article class="answer" data-status={answer.status} data-testid="answer">
      <header class="answer-head">
        <span class="pill" data-cls={STATUS_UI[answer.status].cls}
          >{STATUS_UI[answer.status].label}</span
        >
        <span class="model" data-testid="model"
          >modelo: {answer.model}{transport ? ` · vía ${transport}` : ''}</span
        >
      </header>

      <p class="hint">{STATUS_UI[answer.status].hint}</p>

      <div class="text" data-testid="answer-text">{answer.answer}</div>

      {#if answer.reason}
        <p class="reason">motivo: <code>{answer.reason}</code></p>
      {/if}

      {#if answer.unsupported && answer.unsupported.length}
        <details class="unsupported">
          <summary>
            {answer.unsupported.length} afirmación(es) del modelo sin fuente, no
            publicada(s)
          </summary>
          <ul>
            {#each answer.unsupported as u, i (i)}
              <li>{u}</li>
            {/each}
          </ul>
        </details>
      {/if}

      {#if answer.citations.length}
        <section class="cites" data-testid="citations">
          <h3>Fuentes ({answer.citations.length})</h3>
          <ul>
            {#each answer.citations as c (c.kind + c.id)}
              <li>
                {#if c.url}
                  <a href={c.url}><code>{c.kind}:{c.id}</code></a>
                {:else}
                  <code>{c.kind}:{c.id}</code>
                {/if}
                <span class="c-label">{c.label}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </article>
  {/if}
</section>

<style>
  .ask {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
    border: 1px solid var(--swal-border);
    border-radius: 16px;
    background: var(--swal-surface);
  }
  .head h2 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 800;
    color: var(--swal-text);
    letter-spacing: -0.02em;
  }
  .sub {
    margin: 0;
    font-size: 13px;
    color: var(--swal-text-secondary);
    line-height: 1.5;
  }
  /* 12px en secondary (7.55:1), nunca muted (3.96:1 — falla AA). */
  .index-state { margin: 0; font-size: 12px; color: var(--swal-text-secondary); }
  .index-state[data-state='failed'] { color: var(--swal-warning); }
  .form { display: flex; gap: 8px; flex-wrap: wrap; }
  .input {
    flex: 1 1 260px;
    min-height: 42px;
    padding: 10px 12px;
    font-size: 14px;
    color: var(--swal-text);
    background: var(--swal-bg);
    border: 1px solid var(--swal-border);
    border-radius: 10px;
  }
  .input:focus-visible { outline: 2px solid var(--swal-accent); }
  .btn {
    min-height: 42px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 700;
    color: var(--swal-on-accent);
    background: var(--swal-accent);
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .examples { display: flex; gap: 6px; flex-wrap: wrap; list-style: none; margin: 0; padding: 0; }
  .chip {
    padding: 5px 10px;
    font-size: 12px;
    color: var(--swal-text-secondary);
    background: var(--swal-bg);
    border: 1px solid var(--swal-border);
    border-radius: 999px;
    cursor: pointer;
  }
  .chip:hover { color: var(--swal-accent); }
  .note {
    margin: 0;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--swal-text-secondary);
    border-left: 2px solid var(--swal-accent);
    background: var(--swal-accent-muted, var(--swal-surface));
    border-radius: 8px;
  }
  .answer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--swal-border);
    border-radius: 12px;
    background: var(--swal-bg);
  }
  .answer-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .pill {
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 999px;
    border: 1px solid var(--swal-border);
  }
  .pill[data-cls='ok'] { color: var(--swal-accent); border-color: var(--swal-accent); }
  .pill[data-cls='warn'] { color: var(--swal-warning); border-color: var(--swal-warning); }
  .model { font-size: 12px; color: var(--swal-text-secondary); font-family: var(--swal-font-mono, ui-monospace); }
  .hint { margin: 0; font-size: 12px; color: var(--swal-text-secondary); }
  .text {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--swal-text);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .reason { margin: 0; font-size: 12px; color: var(--swal-text-secondary); }
  .unsupported { font-size: 12px; color: var(--swal-text-secondary); }
  .unsupported ul { margin: 6px 0 0; padding-left: 18px; }
  .cites { border-top: 1px solid var(--swal-border); padding-top: 10px; }
  .cites h3 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--swal-text-secondary); }
  .cites ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .cites li { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .cites code { font-size: 12px; color: var(--swal-accent); overflow-wrap: anywhere; }
  .c-label { font-size: 12px; color: var(--swal-text-secondary); }
  .sr {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
</style>