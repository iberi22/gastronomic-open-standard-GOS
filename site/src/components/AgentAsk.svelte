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

import {
  askGrounded,
  type GosSource,
  type GroundedAnswer,
  queryTerms,
  rankEntries,
} from '../lib/llm'
import { creditStatus, type SocioTier } from '../lib/billing'

export interface CatalogEntry {
  kind: GosSource['kind']
  id: string
  label: string
  url?: string
  snippet?: string
  haystack: string
  fields?: Record<string, string>
}

interface Props {
  entries: CatalogEntry[]
  defaultQuestion?: string
  suggestions?: string[]
}

let { entries, defaultQuestion = '', suggestions = [] }: Props = $props()

const TIERS: Array<{ id: SocioTier['id']; label: string; blurb: string }> = [
  { id: 'free', label: 'Free', blurb: 'Solo lectura del repo. Sin inferencia.' },
  { id: 'socio', label: 'Socio', blurb: 'El modelo resume las fuentes y cita cada dato.' },
]

let question = $state(defaultQuestion)
let tierId = $state<SocioTier['id']>('free')
let answer = $state<GroundedAnswer | null>(null)
let busy = $state(false)
let transport = $state<'local' | 'endpoint' | null>(null)
let endpointNote = $state('')

function creditKey(t: SocioTier['id']): string {
  return 'credits:gos:' + t
}

/**
 * Crédito consumido, leído del MISMO sitio que usa llmComplete()
 * (`credits:{appId}:{tierId}` en localStorage, D1/KV en el Worker).
 *
 * Vive en un $state y no en una función suelta porque el medidor tiene que
 * redibujarse cuando cambia el tier o cuando otro consumo escribe el ledger.
 */
let usedTokens = $state(0)
$effect(() => {
  void tierId
  try {
    if (typeof localStorage === 'undefined') {
      usedTokens = 0
      return
    }
    const raw = localStorage.getItem(creditKey(tierId))
    const n = raw ? parseInt(raw, 10) : 0
    usedTokens = Number.isFinite(n) ? n : 0
  } catch {
    usedTokens = 0
  }
})

const ledger = $derived(creditStatus(usedTokens, tierId))
const limitPct = $derived(
  ledger.limit === 0
    ? 0
    : Math.min(100, Math.round((ledger.used / ledger.limit) * 100)),
)

/** Fuentes de la pregunta, con el mismo matching que usa el endpoint. */
function findSources(q: string): GosSource[] {
  const terms = queryTerms(q)
  if (!terms.length) return []
  const ranked = rankEntries(
    entries.map((e) => ({ id: e.id, haystack: e.haystack })),
    terms,
  )
  const byId = new Map(entries.map((e) => [e.id, e]))
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
    // 1. Endpoint si hay runtime de servidor. Un 405/404 aquí es el caso
    //    normal del deploy estático, no un fallo: se anota y se sigue.
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, tierId, used: usedTokens }),
    }).catch(() => null)

    if (res && res.ok) {
      const body = (await res.json().catch(() => null)) as {
        data?: GroundedAnswer
      } | null
      if (body?.data) {
        answer = body.data
        transport = 'endpoint'
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
      tierId,
      used: usedTokens,
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
  'credit-exhausted': {
    label: 'Crédito agotado',
    cls: 'stop',
    hint: 'Se puede volver a consultar en modo lectura (free), que no gasta crédito.',
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
    : [
        '¿Qué es la alicina?',
        'achiras',
        'vitamina A',
        'beneficios del ajo',
      ],
)
</script>

<section class="ask" aria-labelledby="ask-title">
  <header class="head">
    <h2 id="ask-title">Pregunta al agente de GOS</h2>
    <p class="sub">
      El agente responde solo con lo que hay en el repo y cita la entrada de la
      que lo saca. Si no encuentra la fuente, dice que no lo sabe.
    </p>
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

  <div class="tiers" role="radiogroup" aria-label="Tier de consulta">
    {#each TIERS as t (t.id)}
      <label class="tier" class:on={tierId === t.id}>
        <input
          type="radio"
          name="gos-tier"
          value={t.id}
          checked={tierId === t.id}
          onchange={() => {
            tierId = t.id
            answer = null
          }}
        />
        <span class="tier-name">{t.label}</span>
        <span class="tier-blurb">{t.blurb}</span>
      </label>
    {/each}
  </div>

  {#if tierId !== 'free'}
    <div class="meter" data-testid="credit-meter">
      <div class="meter-row">
        <span class="meter-label">Crédito de inferencia</span>
        <span class="meter-value"
          >{ledger.used} / {ledger.limit} tokens · quedan {ledger.remaining}</span
        >
      </div>
      <div
        class="bar"
        role="progressbar"
        aria-valuenow={ledger.used}
        aria-valuemin="0"
        aria-valuemax={ledger.limit}
      >
        <span class="fill" style={`width: ${limitPct}%`}></span>
      </div>
      <p class="meter-note">
        El ledger se lee del mismo sitio que usa <code>llmComplete()</code>
        (localStorage en el navegador, D1/KV en el Worker).
      </p>
    </div>
  {/if}

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
  .input:focus-visible { outline: 2px solid var(--swal-accent-text, var(--swal-accent)); }
  .btn {
    min-height: 42px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: var(--swal-btn-bg, var(--swal-accent));
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .tiers { display: flex; gap: 8px; flex-wrap: wrap; }
  .tier {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border: 1px solid var(--swal-border);
    border-radius: 10px;
    cursor: pointer;
    background: var(--swal-bg);
  }
  .tier.on {
    border-color: var(--swal-accent);
    background: var(--swal-accent-muted, var(--swal-surface));
  }
  .tier input { position: absolute; opacity: 0; width: 0; height: 0; }
  .tier-name { font-size: 13px; font-weight: 700; color: var(--swal-text); }
  /* 12px en secondary (7.55:1), nunca muted (3.96:1 — falla AA). */
  .tier-blurb { font-size: 12px; color: var(--swal-text-secondary); }
  .meter {
    padding: 10px 12px;
    border: 1px solid var(--swal-border);
    border-radius: 10px;
    background: var(--swal-bg);
  }
  .meter-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--swal-text-secondary);
  }
  .meter-value { font-family: var(--swal-font-mono, ui-monospace); }
  .bar {
    margin-top: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--swal-border);
    overflow: hidden;
  }
  .fill { display: block; height: 100%; background: var(--swal-accent); }
  .meter-note { margin: 6px 0 0; font-size: 12px; color: var(--swal-text-secondary); }
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
  .chip:hover { color: var(--swal-accent-text, var(--swal-accent)); }
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
  .pill[data-cls='ok'] { color: var(--swal-accent-text, var(--swal-accent)); border-color: var(--swal-accent); }
  .pill[data-cls='warn'] { color: #d97706; border-color: #d97706; }
  .pill[data-cls='stop'] { color: #dc2626; border-color: #dc2626; }
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
  .cites code { font-size: 12px; color: var(--swal-accent-text, var(--swal-accent)); overflow-wrap: anywhere; }
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