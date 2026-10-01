<script lang="ts">
// site/src/components/RecipeVault.svelte — vault de recetas privadas, 100% local.
//
// OFFLINE-FIRST (requisito duro): crear, leer, borrar, importar y exportar pasan
// SIEMPRE por IndexedDBStorageAdapter. Ni un solo fetch/XHR/WebSocket en ninguna
// de esas rutas: con el móvil en modo avión el vault funciona entero. Lo único
// que toca red es la traducción on-device de Chrome, que es opcional y degrada
// solo (el vault queda en español si el navegador no la soporta).
//
// i18n: patrón del repo — fuente en español (chrome-translate.ts SOURCE_LANG)
// y traducción on-device del DOM a ES/EN/ZH vía TranslateMenu. Por eso los
// textos visibles son español plano en el markup; no hay diccionario propio.
//
// Accesibilidad (WCAG AA): texto bajo 14px usa --swal-text-secondary (medido
// 7.55:1 en surface oscuro, 7.63:1 en claro). NUNCA --swal-text-muted
// (3.96:1 / 2.52:1 — falla 4.5:1). Acento: var(--swal-accent-text,
// var(--swal-accent)) — 5.22:1 / 5.70:1.

import type { DomainRecord, StorageAdapter } from '../lib/domain'
import { IndexedDBStorageAdapter, isIndexedDBAvailable } from '../lib/indexeddb'
import {
  VAULT_INSTANCE,
  vaultCreate,
  vaultDelete,
  vaultExport,
  vaultImport,
  vaultList,
  vaultUpdate,
} from '../lib/recipe-vault'

type Mode = 'create' | 'edit' | null

interface Props {
  /** instance_id por defecto; el vault es local y aislado por defecto. */
  instanceId?: string
}

const { instanceId = VAULT_INSTANCE }: Props = $props()

// Inyección para tests: por defecto el IndexedDB real del navegador.
let adapter: StorageAdapter = new IndexedDBStorageAdapter()

let records = $state<DomainRecord[]>([])
let loading = $state(true)
let unsupported = $state(false)
let mode = $state<Mode>(null)
let editingId = $state<string | null>(null)
let error = $state('')
let notice = $state('')

// --- Estado del formulario ---
let fTitle = $state('')
let fRegion = $state('')
let fCountry = $state('')
let fPrep = $state('')
let fCook = $state('')
let fServings = $state('')
let fDifficulty = $state(3)
let fIngredients = $state('')
let fInstructions = $state('')
let fFlavor = $state('')
let fTexture = $state('')
let fAroma = $state('')
let fPresentation = $state('')
let fCalories = $state('')
let fProtein = $state('')
let fFat = $state('')
let fCarbs = $state('')
let fNotes = $state('')

let fileInput: HTMLInputElement | undefined = $state()

async function refresh(): Promise<void> {
  loading = true
  try {
    records = await vaultList(adapter, instanceId)
    unsupported = false
  } catch (err) {
    unsupported = true
    error = `No se pudo abrir el vault local: ${String(err)}`
  } finally {
    loading = false
  }
}

// Carga inicial. IndexedDB no existe en SSR: el componente degrada a vacío.
$effect(() => {
  if (typeof window === 'undefined') return
  unsupported = !isIndexedDBAvailable()
  void refresh()
})

function resetForm(): void {
  fTitle = ''
  fRegion = ''
  fCountry = ''
  fPrep = ''
  fCook = ''
  fServings = ''
  fDifficulty = 3
  fIngredients = ''
  fInstructions = ''
  fFlavor = ''
  fTexture = ''
  fAroma = ''
  fPresentation = ''
  fCalories = ''
  fProtein = ''
  fFat = ''
  fCarbs = ''
  fNotes = ''
}

/** Monta el form desde un record existente (editar) o vacío (crear). */
function startCreate(): void {
  resetForm()
  editingId = null
  mode = 'create'
  error = ''
  notice = ''
}

function startEdit(rec: DomainRecord): void {
  const title = typeof rec.title === 'string' ? rec.title : ''
  const region = typeof rec.region === 'string' ? rec.region : ''
  const country = typeof rec.country === 'string' ? rec.country : ''
  const diffStars = typeof rec.difficulty === 'string' ? rec.difficulty : ''
  const ing = Array.isArray(rec.main_ingredients)
    ? (rec.main_ingredients as unknown[]).map(String)
    : []
  const ins = Array.isArray(rec.instructions)
    ? (rec.instructions as unknown[]).map(String)
    : []
  const sensory =
    rec.sensory && typeof rec.sensory === 'object'
      ? (rec.sensory as Record<string, unknown>)
      : {}
  const nut =
    rec.nutrition && typeof rec.nutrition === 'object'
      ? (rec.nutrition as Record<string, unknown>)
      : {}
  const macros =
    nut.macros && typeof nut.macros === 'object'
      ? (nut.macros as Record<string, unknown>)
      : {}

  fTitle = title
  fRegion = region
  fCountry = country
  fPrep = typeof rec.prep_time === 'string' ? rec.prep_time : ''
  fCook = typeof rec.cook_time === 'string' ? rec.cook_time : ''
  fServings = typeof rec.servings === 'string' ? rec.servings : ''
  const stars = (diffStars.match(/★/g) || []).length
  fDifficulty = stars > 0 ? stars : 3
  fIngredients = ing.join('\n')
  fInstructions = ins.join('\n')
  fFlavor = typeof sensory.flavor === 'string' ? sensory.flavor : ''
  fTexture = typeof sensory.texture === 'string' ? sensory.texture : ''
  fAroma = typeof sensory.aroma === 'string' ? sensory.aroma : ''
  fPresentation =
    typeof sensory.presentation === 'string' ? sensory.presentation : ''
  fCalories = typeof nut.calories === 'number' ? String(nut.calories) : ''
  fProtein =
    typeof macros.protein_g === 'number' ? String(macros.protein_g) : ''
  fFat = typeof macros.fat_g === 'number' ? String(macros.fat_g) : ''
  fCarbs = typeof macros.carbs_g === 'number' ? String(macros.carbs_g) : ''
  fNotes = typeof rec.notes === 'string' ? rec.notes : ''

  editingId = rec.id
  mode = 'edit'
  error = ''
  notice = ''
}

/** Ensambla el form → el shape que espera validateVaultRecipe. */
function collectForm(): Record<string, unknown> {
  const sensory: Record<string, string> = {}
  if (fFlavor.trim()) sensory.flavor = fFlavor.trim()
  if (fTexture.trim()) sensory.texture = fTexture.trim()
  if (fAroma.trim()) sensory.aroma = fAroma.trim()
  if (fPresentation.trim()) sensory.presentation = fPresentation.trim()

  const macros: Record<string, number> = {}
  if (fProtein.trim()) macros.protein_g = Number(fProtein)
  if (fFat.trim()) macros.fat_g = Number(fFat)
  if (fCarbs.trim()) macros.carbs_g = Number(fCarbs)
  const nutrition: Record<string, unknown> = {}
  if (fCalories.trim()) nutrition.calories = Number(fCalories)
  if (Object.keys(macros).length > 0) nutrition.macros = macros

  return {
    title: fTitle,
    region: fRegion,
    country: fCountry,
    prep_time: fPrep,
    cook_time: fCook,
    servings: fServings,
    difficulty: fDifficulty,
    main_ingredients: fIngredients.split('\n').map((s) => s.trim()),
    instructions: fInstructions.split('\n').map((s) => s.trim()),
    sensory,
    nutrition,
    notes: fNotes,
  }
}

/**
 * Persiste el formulario. Delega en la capa headless: la validación contra el
 * estándar y el aislamiento por instance_id viven allí, no aquí.
 */
async function save(): Promise<void> {
  error = ''
  notice = ''
  try {
    const result =
      mode === 'edit' && editingId
        ? await vaultUpdate(adapter, instanceId, editingId, collectForm())
        : await vaultCreate(adapter, instanceId, collectForm(), records)
    if (!result.ok) {
      error = result.error ?? 'No se pudo guardar.'
      return
    }
    const saved = result.records?.[0]
    const title = typeof saved?.title === 'string' ? saved.title : 'La receta'
    notice =
      mode === 'edit'
        ? `«${title}» actualizada en este dispositivo.`
        : `«${title}» guardada solo en este dispositivo.`
    mode = null
    editingId = null
    resetForm()
    await refresh()
  } catch (err) {
    error = `No se pudo guardar en este dispositivo: ${String(err)}`
  }
}

async function remove(rec: DomainRecord): Promise<void> {
  error = ''
  notice = ''
  const label = typeof rec.title === 'string' ? rec.title : rec.id
  try {
    const result = await vaultDelete(adapter, instanceId, rec.id)
    if (result.ok) notice = `«${label}» borrada de este dispositivo.`
    else error = result.error ?? `No se encontró «${label}».`
    if (editingId === rec.id) {
      mode = null
      editingId = null
      resetForm()
    }
    await refresh()
  } catch (err) {
    error = `No se pudo borrar: ${String(err)}`
  }
}

/**
 * Exporta el vault entero a un JSON descargable. vaultExport() genera el texto
 * íntegramente en memoria; el Blob + click de aquí es solo la descarga. Sin red.
 */
function exportVault(): void {
  error = ''
  notice = ''
  try {
    const { json, filename } = vaultExport(records)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    notice = `Exportadas ${records.length} receta(s). El archivo es tuyo, no se envía a ningún servidor.`
  } catch (err) {
    error = `No se pudo exportar: ${String(err)}`
  }
}

/**
 * Importa un JSON del vault. Delega en vaultImport: revalida cada receta y le
 * asigna id nuevo, así que una importación nunca pisa lo que ya está guardado.
 */
async function importVault(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  error = ''
  notice = ''
  try {
    const result = await vaultImport(
      adapter,
      instanceId,
      await file.text(),
      records,
    )
    await refresh()
    if (result.error) error = result.error
    const rejectedNote =
      (result.rejected ?? 0) > 0
        ? ` ${result.rejected} receta(s) descartada(s) por no cumplir el estándar.`
        : ''
    if ((result.imported ?? 0) > 0) {
      notice = `Importadas ${result.imported} receta(s) a este dispositivo.${rejectedNote}`
    } else if (!error) {
      notice = 'No se importó ninguna receta.'
    }
  } catch (err) {
    error = `No se pudo leer el archivo: ${String(err)}`
  } finally {
    // Permite reimportar el mismo archivo dos veces seguidas.
    input.value = ''
  }
}

function cancel(): void {
  mode = null
  editingId = null
  resetForm()
}

function pickFile(): void {
  fileInput?.click()
}

let visible = $derived(
  records.map((r) => {
    const ing = Array.isArray(r.main_ingredients)
      ? (r.main_ingredients as unknown[]).filter((x) => String(x).trim() !== '')
      : []
    const ins = Array.isArray(r.instructions)
      ? (r.instructions as unknown[]).filter((x) => String(x).trim() !== '')
      : []
    return { rec: r, ingredients: ing, instructions: ins }
  }),
)
</script>

<section class="vault" aria-labelledby="rv-heading">
  <header class="head">
    <h2 id="rv-heading">Mi vault de recetas</h2>
    <p class="sub">
      Tus recetas y variantes viven solo en este dispositivo. Sin servidor, sin
      nube y sin cuenta: funciona igual sin conexión.
    </p>
  </header>

  <div class="toolbar">
    <button type="button" class="btn primary" onclick={startCreate}>
      + Nueva receta
    </button>
    <button type="button" class="btn" onclick={exportVault} disabled={records.length === 0}>
      Exportar JSON
    </button>
    <button type="button" class="btn" onclick={pickFile} disabled={unsupported}>
      Importar JSON
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="application/json,.json"
      class="file-input"
      onchange={importVault}
      aria-label="Elegir archivo JSON del vault para importar"
    />
  </div>

  <p class="status" role="status" aria-live="polite">
    {#if unsupported}
      Este navegador no expone IndexedDB, así que el vault no puede guardar nada.
    {:else if loading}
      Abriendo el vault local…
    {:else}
      {records.length} receta(s) guardada(s) en este dispositivo.
    {/if}
  </p>
  {#if error}
    <p class="msg error" role="alert">{error}</p>
  {/if}
  {#if notice}
    <p class="msg notice">{notice}</p>
  {/if}

  {#if mode}
    <form
      class="editor"
      onsubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <h3>{mode === 'edit' ? 'Editar receta' : 'Nueva receta'}</h3>

      <div class="grid">
        <label class="field span2">
          <span class="lbl">Título</span>
          <input class="inp" type="text" bind:value={fTitle} required />
        </label>

        <label class="field">
          <span class="lbl">Región</span>
          <input class="inp" type="text" bind:value={fRegion} placeholder="Andina" />
        </label>

        <label class="field">
          <span class="lbl">País</span>
          <input
            class="inp"
            type="text"
            bind:value={fCountry}
            placeholder="Se deriva del slug si lo dejas vacío"
          />
        </label>

        <label class="field">
          <span class="lbl">Preparación (min)</span>
          <input class="inp" type="text" bind:value={fPrep} placeholder="45" />
        </label>

        <label class="field">
          <span class="lbl">Cocción (min)</span>
          <input class="inp" type="text" bind:value={fCook} placeholder="30" />
        </label>

        <label class="field">
          <span class="lbl">Porciones</span>
          <input class="inp" type="text" bind:value={fServings} placeholder="4" />
        </label>

        <label class="field">
          <span class="lbl">Dificultad: {fDifficulty}/5</span>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            bind:value={fDifficulty}
            class="range"
          />
        </label>

        <label class="field span2">
          <span class="lbl">Ingredientes (uno por línea)</span>
          <textarea class="inp" rows="5" bind:value={fIngredients} required></textarea>
        </label>

        <label class="field span2">
          <span class="lbl">Instrucción (una por línea)</span>
          <textarea class="inp" rows="5" bind:value={fInstructions}></textarea>
        </label>
      </div>

      <fieldset class="fs">
        <legend class="lg">Sensorial (opcional)</legend>
        <div class="grid">
          <label class="field">
            <span class="lbl">Sabor</span>
            <input class="inp" type="text" bind:value={fFlavor} />
          </label>
          <label class="field">
            <span class="lbl">Textura</span>
            <input class="inp" type="text" bind:value={fTexture} />
          </label>
          <label class="field">
            <span class="lbl">Aroma</span>
            <input class="inp" type="text" bind:value={fAroma} />
          </label>
          <label class="field">
            <span class="lbl">Presentación</span>
            <input class="inp" type="text" bind:value={fPresentation} />
          </label>
        </div>
      </fieldset>

      <fieldset class="fs">
        <legend class="lg">Nutrición por porción (opcional)</legend>
        <div class="grid">
          <label class="field">
            <span class="lbl">Calorías</span>
            <input class="inp" type="text" bind:value={fCalories} inputmode="numeric" />
          </label>
          <label class="field">
            <span class="lbl">Proteína (g)</span>
            <input class="inp" type="text" bind:value={fProtein} inputmode="numeric" />
          </label>
          <label class="field">
            <span class="lbl">Grasa (g)</span>
            <input class="inp" type="text" bind:value={fFat} inputmode="numeric" />
          </label>
          <label class="field">
            <span class="lbl">Carbohidratos (g)</span>
            <input class="inp" type="text" bind:value={fCarbs} inputmode="numeric" />
          </label>
        </div>
      </fieldset>

      <label class="field">
        <span class="lbl">Notas personales</span>
        <textarea class="inp" rows="3" bind:value={fNotes}></textarea>
      </label>

      <div class="actions">
        <button type="submit" class="btn primary">
          {mode === 'edit' ? 'Guardar cambios' : 'Guardar en este dispositivo'}
        </button>
        <button type="button" class="btn" onclick={cancel}>Cancelar</button>
      </div>
      <p class="hint">
        Se valida contra el estándar GOS antes de guardar: lo que esté vacío o en
        cero se omite, y los ingredientes de relleno se descartan.
      </p>
    </form>
  {/if}

  {#if visible.length > 0}
    <ul class="list">
      {#each visible as item (item.rec.id)}
        <li class="item">
          <div class="item-head">
            <h4 class="item-title">
              {String(item.rec.title ?? 'Sin título')}
            </h4>
            {#if item.rec.country}
              <span class="chip accent">{String(item.rec.country)}</span>
            {/if}
            {#if item.rec.difficulty}
              <span class="chip">{String(item.rec.difficulty)}</span>
            {/if}
          </div>

          {#if item.rec.prep_time || item.rec.cook_time || item.rec.servings}
            <p class="meta">
              {#if item.rec.prep_time}<span>Prep {String(item.rec.prep_time)}</span>{/if}
              {#if item.rec.cook_time}<span>Cook {String(item.rec.cook_time)}</span>{/if}
              {#if item.rec.servings}<span>Sirve {String(item.rec.servings)}</span>{/if}
            </p>
          {/if}

          {#if item.ingredients.length > 0}
            <ul class="ings">
              {#each item.ingredients as ing}
                <li>{String(ing)}</li>
              {/each}
            </ul>
          {/if}

          {#if item.instructions.length > 0}
            <ol class="steps">
              {#each item.instructions as step}
                <li>{String(step)}</li>
              {/each}
            </ol>
          {/if}

          {#if typeof item.rec.notes === 'string' && item.rec.notes.trim() !== ''}
            <p class="notes">{String(item.rec.notes)}</p>
          {/if}

          <div class="item-actions">
            <button type="button" class="btn sm" onclick={() => startEdit(item.rec)}>
              Editar
            </button>
            <button
              type="button"
              class="btn sm danger"
              onclick={() => remove(item.rec)}
            >
              Borrar
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {:else if !loading && !unsupported && mode === null}
    <p class="empty">
      Todavía no guardas ninguna receta. Crea una variante propia o importa un
      JSON del vault para empezar.
    </p>
  {/if}
</section>

<style>
  .vault {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--swal-border);
    border-radius: 20px;
    background: var(--swal-surface);
  }
  .head { display: flex; flex-direction: column; gap: 4px; }
  h2 { margin: 0; font-size: 18px; font-weight: 800; color: var(--swal-text); }
  .sub {
    margin: 0;
    /* 13px < 14px: usa --swal-text-secondary (7.55:1), nunca muted (3.96:1). */
    font-size: 13px;
    line-height: 1.6;
    color: var(--swal-text-secondary);
  }

  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    font-family: var(--swal-font);
    font-size: 13px;
    font-weight: 600;
    color: var(--swal-text-secondary);
    background: var(--swal-bg);
    border: 1px solid var(--swal-border);
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease;
    touch-action: manipulation;
  }
  .btn:hover:not(:disabled) { border-color: var(--swal-accent); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn.primary {
    background: var(--swal-accent);
    border-color: var(--swal-accent);
    color: #fff;
  }
  .btn.danger { color: var(--swal-accent-text, var(--swal-accent)); }
  .btn.sm { padding: 6px 10px; font-size: 12px; }

  .status {
    margin: 0;
    font-size: 12px;
    color: var(--swal-text-secondary);
  }
  .msg {
    margin: 0;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.5;
    border: 1px solid;
  }
  .msg.error {
    color: var(--swal-accent-text, var(--swal-accent));
    border-color: color-mix(in srgb, var(--swal-accent) 40%, var(--swal-border));
    background: color-mix(in srgb, var(--swal-accent) 8%, transparent);
  }
  .msg.notice {
    color: var(--swal-text-secondary);
    border-color: var(--swal-border);
    background: var(--swal-bg);
  }

  .editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--swal-border);
    border-radius: 16px;
    background: var(--swal-bg);
  }
  h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--swal-text); }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  @media (max-width: 560px) {
    .grid { grid-template-columns: 1fr; }
  }
  .field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .span2 { grid-column: 1 / -1; }
  .lbl {
    font-size: 12px;
    font-weight: 600;
    color: var(--swal-text-secondary);
  }
  .inp {
    width: 100%;
    padding: 9px 10px;
    font-family: var(--swal-font);
    font-size: 13px;
    color: var(--swal-text);
    background: var(--swal-surface);
    border: 1px solid var(--swal-border);
    border-radius: 8px;
    box-sizing: border-box;
  }
  .inp:focus-visible {
    outline: 2px solid var(--swal-accent);
    outline-offset: 1px;
  }
  .range { width: 100%; accent-color: var(--swal-accent); }

  .fs {
    border: 1px solid var(--swal-border);
    border-radius: 12px;
    padding: 12px;
    margin: 0;
  }
  .lg {
    font-size: 12px;
    font-weight: 700;
    color: var(--swal-accent-text, var(--swal-accent));
    padding: 0 6px;
  }

  .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--swal-text-secondary);
  }

  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border: 1px solid var(--swal-border);
    border-left: 3px solid var(--swal-accent);
    border-radius: 14px;
    background: var(--swal-bg);
  }
  .item-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .item-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--swal-text); }
  .chip {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--swal-border);
    color: var(--swal-text-secondary);
    background: var(--swal-surface);
  }
  .chip.accent { color: var(--swal-accent-text, var(--swal-accent)); }

  .meta {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 12px;
    color: var(--swal-text-secondary);
  }
  .ings, .steps { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.65; color: var(--swal-text-secondary); }
  .notes {
    margin: 0;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--swal-text-secondary);
    background: var(--swal-surface);
  }
  .item-actions { display: flex; gap: 8px; }

  .empty {
    margin: 0;
    padding: 18px;
    border: 1px dashed var(--swal-border);
    border-radius: 14px;
    text-align: center;
    font-size: 13px;
    line-height: 1.6;
    color: var(--swal-text-secondary);
  }
</style>