<script lang="ts">
import type GraphType from 'graphology'
import type { Sigma as SigmaType } from 'sigma'
import { onMount, tick } from 'svelte'

// Mini-mapa del grafo en el home. Mismo lenguaje visual que /graph:
// 2 tonos (papel + tinta), sin bordes, jerarquía por número de conexiones,
// etiquetas monoespaciadas con halo. Cero física en cliente (FA2 del build).
interface GNodeDatum {
  id: string
  label?: string
  type?: string
  size?: number
  x?: number
  y?: number
}
interface GEdgeDatum {
  source: string
  target: string
}
interface GraphData {
  nodes: GNodeDatum[]
  edges: GEdgeDatum[]
}

const TYPE_LABELS: Record<string, string> = {
  recipe: 'Recetas',
  ingredient: 'Ingredientes',
  vitamin: 'Vitaminas',
  nutrient: 'Nutrientes',
  flavor: 'Sabores',
  texture: 'Texturas',
  technique: 'Técnicas',
  region: 'Regiones',
  place: 'Lugares',
  category: 'Categorías',
  condition: 'Afecciones',
  substance: 'Substancias',
  diet: 'Dietas',
}
const TYPE_ORDER = [
  'recipe',
  'ingredient',
  'vitamin',
  'nutrient',
  'substance',
  'condition',
  'diet',
  'flavor',
  'texture',
  'aroma',
  'region',
  'category',
  'place',
  'technique',
]

let container = $state<HTMLDivElement | null>(null)
let renderer: SigmaType | null = null
let stats = $state({ nodes: 0, edges: 0 })
let legend = $state<{ t: string; n: number }[]>([])
let loading = $state(true)
let error = $state<string | null>(null)
let selected = $state<{
  id: string
  label: string
  type: string
  conns: number
} | null>(null)
let fullData: GraphData | null = null

async function loadGraphData(): Promise<GraphData> {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const candidates = [
    `${base}/graph-data.json`,
    '/graph-data.json',
    './graph-data.json',
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url)
      if (r.ok) return (await r.json()) as GraphData
    } catch {}
  }
  throw new Error('graph-data.json no encontrado')
}

onMount(() => {
  void (async () => {
    try {
      // Imports dinámicos: sigma/WebGL solo existe en cliente (SSR revienta si no).
      const [{ default: Graph }, { default: Sigma }] = await Promise.all([
        import('graphology'),
        import('sigma'),
      ])
      const data = await loadGraphData()
      fullData = data
      stats = {
        nodes: data.nodes?.length || 0,
        edges: data.edges?.length || 0,
      }
      const counts: Record<string, number> = {}
      for (const n of data.nodes || [])
        counts[n.type || ''] = (counts[n.type || ''] || 0) + 1
      legend = TYPE_ORDER.filter((t) => counts[t]).map((t) => ({
        t,
        n: counts[t],
      }))
      loading = false
      await tick()
      if (container) renderSigma(container, data, Graph, Sigma)
      else error = 'graph container not mounted'
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      loading = false
    }
  })()
  return () => {
    renderer?.kill()
    renderer = null
  }
})

function renderSigma(
  el: HTMLDivElement,
  data: GraphData,
  Graph: typeof GraphType,
  Sigma: new (
    graph: GraphType,
    container: HTMLElement,
    settings?: Record<string, unknown>,
  ) => SigmaType,
) {
  // Muestra estratificada por tipo, sobre las posiciones FA2 del build.
  const byType = new Map<string, GNodeDatum[]>()
  for (const n of data.nodes || []) {
    const t = n.type || 'misc'
    const list = byType.get(t)
    if (list) list.push(n)
    else byType.set(t, [n])
  }
  const PER_TYPE = 16
  const subset: GNodeDatum[] = []
  for (const list of byType.values()) {
    const step = Math.max(1, Math.floor(list.length / PER_TYPE))
    for (let i = 0; i < list.length && subset.length < 200; i += step) {
      subset.push(list[i])
      if (subset.filter((s) => s.type === list[i].type).length >= PER_TYPE)
        break
    }
  }
  const nodeIds = new Set(subset.map((n) => n.id))

  // grado dentro del subgrafo → tamaño y tono
  const deg: Record<string, number> = {}
  let maxDeg = 1
  ;(data.edges || []).forEach((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return
    deg[e.source] = (deg[e.source] || 0) + 1
    deg[e.target] = (deg[e.target] || 0) + 1
  })
  Object.values(deg).forEach((d) => {
    if (d > maxDeg) maxDeg = d
  })
  const imp = (id: string) => Math.sqrt(deg[id] || 0) / Math.sqrt(maxDeg)

  const inkRgb = () =>
    getComputedStyle(el).getPropertyValue('--g-rgb').trim() || '23,23,23'
  const rgba = (a: number) => `rgba(${inkRgb()},${a})`
  const paper = () =>
    getComputedStyle(el).getPropertyValue('--g-paper').trim() || '#eaeae8'

  // sangrado exacto al ancho del cliente (sin el hueco de la barra de scroll).
  // Se mide la propia caja: robusto a cualquier contenedor y a shifts del layout.
  const applyBleed = () => {
    const wrap = el.parentElement
    if (!wrap?.isConnected) return
    const vw = document.documentElement.clientWidth
    if (!vw) return
    const rect = wrap.getBoundingClientRect()
    const ml = parseFloat(getComputedStyle(wrap).marginLeft) || 0
    wrap.style.width = `${vw}px`
    wrap.style.marginLeft = `${ml - rect.left}px`
    wrap.style.marginRight = '0px'
  }
  applyBleed()

  const g = new Graph({ multi: true })
  subset.forEach((n, i) => {
    g.addNode(n.id, {
      label: (n.label || n.id).toUpperCase(),
      size: 2.6 + 7.4 * imp(n.id),
      color: rgba(0.24 + 0.6 * imp(n.id)),
      lcolor: rgba(0.5 + 0.4 * imp(n.id)),
      x: typeof n.x === 'number' ? n.x : Math.cos(i) * 10,
      y: typeof n.y === 'number' ? n.y : Math.sin(i) * 10,
    })
  })
  ;(data.edges || [])
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .slice(0, 420)
    .forEach((e) => {
      try {
        g.addEdge(e.source, e.target, { color: rgba(0.24), size: 0.5 })
      } catch {}
    })

  // etiquetas mono con halo + anti-colisión por frame
  interface LabelNodeData {
    label?: string
    x: number
    y: number
    size?: number
    lcolor?: string
  }
  interface LabelSettings {
    labelSize: number
    labelFont: string
    labelWeight: string
    labelColor: { attribute?: string; color?: string }
  }
  let boxes: { x0: number; x1: number; y0: number; y1: number }[] = []
  const drawLabel = (
    ctx: CanvasRenderingContext2D,
    d: LabelNodeData,
    settings: LabelSettings,
  ) => {
    if (!d.label) return
    ctx.font = `${settings.labelWeight} ${settings.labelSize}px ${settings.labelFont}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const x = d.x
    const y = d.y + (d.size || 0) + 3
    const w = ctx.measureText(d.label).width
    const box = {
      x0: x - w / 2 - 3,
      x1: x + w / 2 + 3,
      y0: y - 2,
      y1: y + settings.labelSize + 3,
    }
    for (const b of boxes) {
      if (box.x1 > b.x0 && box.x0 < b.x1 && box.y1 > b.y0 && box.y0 < b.y1)
        return
    }
    boxes.push(box)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3.5
    ctx.strokeStyle = paper()
    ctx.strokeText(d.label, x, y)
    ctx.fillStyle = settings.labelColor.attribute
      ? d[settings.labelColor.attribute] || settings.labelColor.color
      : settings.labelColor.color
    ctx.fillText(d.label, x, y)
  }
  const drawRing = (ctx: CanvasRenderingContext2D, d: LabelNodeData) => {
    ctx.beginPath()
    ctx.arc(d.x, d.y, (d.size || 3) + 2.5, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(0.55)
    ctx.lineWidth = 1
    ctx.stroke()
  }

  renderer?.kill()
  renderer = new Sigma(g, el, {
    autoRescale: false,
    defaultEdgeColor: rgba(0.24),
    defaultEdgeType: 'line',
    labelFont: "'Geist Mono', ui-monospace, monospace",
    labelSize: 9.5,
    labelWeight: '500',
    labelColor: { attribute: 'lcolor', color: rgba(0.5) },
    labelDensity: 0.7,
    labelGridCellSize: 90,
    labelRenderedSizeThreshold: 5,
    defaultDrawNodeLabel: drawLabel,
    defaultDrawNodeHover: drawRing,
    minEdgeThickness: 1,
    inertiaDuration: 420,
    zoomDuration: 400,
    enableCameraRotation: false,
    minCameraRatio: 0.05,
    maxCameraRatio: 5,
  })

  // guarda posiciones originales y re-encuadra al cambiar el tamaño
  const original = new Map<string, { x: number; y: number }>()
  g.forEachNode((id, a) => original.set(id, { x: a.x, y: a.y }))
  const fitFromOriginal = () => {
    const W = el.clientWidth,
      H = el.clientHeight
    if (!W || !H) return
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    original.forEach((p) => {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    })
    if (!Number.isFinite(minX)) return
    const gw0 = Math.max(maxX - minX, 1e-6),
      gh0 = Math.max(maxY - minY, 1e-6)
    const target = W / H,
      ga = gw0 / gh0
    const sx = ga < target ? Math.min(target / ga, 3.4) : 1
    const sy = ga >= target ? Math.min(ga / target, 3.4) : 1
    const gw = gw0 * sx,
      gh = gh0 * sy
    const k = (0.94 * W) / gw
    const ox = (W - gw * k) / 2,
      oy = (H - gh * k) / 2
    original.forEach((p, id) => {
      g.setNodeAttribute(
        id,
        'x',
        Math.min(Math.max((p.x - minX) * sx * k + ox, ox + 2), ox + gw * k - 2),
      )
      g.setNodeAttribute(
        id,
        'y',
        Math.min(Math.max((p.y - minY) * sy * k + oy, oy + 2), oy + gh * k - 2),
      )
    })
    renderer?.refresh()
  }
  fitFromOriginal()

  // cámara en el espacio normalizado de sigma (0.5, 0.5 = centro)
  renderer.getCamera().setState({ x: 0.5, y: 0.5, angle: 0, ratio: 1.6 })
  renderer
    .getCamera()
    .animate(
      { x: 0.5, y: 0.5, angle: 0, ratio: 1 },
      { duration: 900, easing: 'quadraticOut' },
    )

  renderer.on('beforeRender', () => {
    boxes = []
  })
  const el2 = el as HTMLElement & { _ro?: ResizeObserver }
  if (typeof ResizeObserver !== 'undefined') {
    el2._ro = new ResizeObserver(() => {
      applyBleed()
      fitFromOriginal()
    })
    el2._ro.observe(el)
  }

  // Click en el mini-mapa: ficha inline sin salir del home.
  renderer.on('clickNode', (e) => {
    const datum = fullData?.nodes.find((n) => n.id === e.node)
    const conns =
      fullData?.edges.filter(
        (ed) => ed.source === e.node || ed.target === e.node,
      ).length || 0
    selected = {
      id: e.node,
      label: datum?.label || e.node,
      type: datum?.type || 'misc',
      conns,
    }
  })
  renderer.on('clickStage', () => {
    selected = null
  })

  // repinta la paleta si cambia el tema
  const repaint = () => {
    g.forEachNode((id) => {
      g.setNodeAttribute(id, 'color', rgba(0.24 + 0.6 * imp(id)))
      g.setNodeAttribute(id, 'lcolor', rgba(0.5 + 0.4 * imp(id)))
    })
    g.forEachEdge((id) => g.setEdgeAttribute(id, 'color', rgba(0.24)))
    renderer?.refresh()
  }
  new MutationObserver(repaint).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  // la página puede desplazarse al cargar fuentes/imágenes: re-sangra y re-encuadra
  window.addEventListener('load', () => {
    applyBleed()
    fitFromOriginal()
  })
  document.fonts?.ready?.then(() => {
    applyBleed()
    fitFromOriginal()
  })
}
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') selected = null }} />
<div class="gos-graph-wrap">
  <div class="map-head">
    <span class="map-title">Grafo de conocimiento</span>
    <span class="map-stats">{stats.nodes.toLocaleString('es')} entidades · {stats.edges.toLocaleString('es')} relaciones</span>
    <a href={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/graph`} class="map-link">Explorar el grafo completo →</a>
  </div>
  {#if loading}
    <div class="map-state"><span class="bar"><i></i></span><span>Cargando el mapa…</span></div>
  {:else if error}
    <div class="map-state error">No se pudo cargar: {error}</div>
  {:else}
    <div bind:this={container} class="map-canvas"></div>
  {/if}
  {#if selected}
    <div class="map-modal">
      <button class="map-backdrop" aria-label="Cerrar ficha" onclick={() => (selected = null)}></button>
      <div class="map-card" role="dialog" aria-modal="true" aria-label={selected.label}>
        <div class="map-card-type">{TYPE_LABELS[selected.type] || selected.type}</div>
        <strong>{selected.label}</strong>
        <span class="map-card-meta">{selected.conns.toLocaleString('es')} conexiones</span>
        <div class="map-card-actions">
          <a href={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/graph?node=${encodeURIComponent(selected.id)}`} class="map-cta">Ver en el grafo →</a>
          <button class="map-btn" onclick={() => (selected = null)}>Cerrar</button>
        </div>
      </div>
    </div>
  {/if}
  <div class="map-legend">
    {#each legend as item (item.t)}
      <span class="legend-item">{TYPE_LABELS[item.t] || item.t} <span class="n">{item.n.toLocaleString('es')}</span></span>
    {/each}
  </div>
</div>

<style>
  .gos-graph-wrap {
    --g-paper: #eaeae8;
    --g-ink: #171717;
    --g-rgb: 23, 23, 23;
    --g-hair: color-mix(in srgb, var(--g-ink) 16%, transparent);
    --g-muted: color-mix(in srgb, var(--g-ink) 76%, transparent);
    --g-faint: color-mix(in srgb, var(--g-ink) 60%, transparent);
    --g-sheet: color-mix(in srgb, var(--g-ink) 4%, var(--g-paper));
    --g-hover: color-mix(in srgb, var(--g-ink) 6%, transparent);
    position: relative;
    width: 100vw;
    max-width: 100vw;
    margin-left: calc(50% - 50vw);
    background: var(--g-paper);
    color: var(--g-ink);
    font-family: var(--swal-font-mono, monospace);
    overflow: hidden;
  }
  :global([data-theme='antigravity']) .gos-graph-wrap {
    --g-paper: #0b0b0c;
    --g-ink: #dededa;
    --g-rgb: 222, 222, 218;
  }
  .map-head {
    display: flex;
    align-items: baseline;
    gap: 20px;
    flex-wrap: wrap;
    max-width: 1280px;
    margin-inline: auto;
    box-sizing: border-box;
    padding: 22px 16px 0;
  }
  .map-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--g-ink); }
  .map-stats { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--g-faint); }
  .map-link {
    margin-left: auto;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--g-faint);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    padding-bottom: 2px;
    transition: color 0.2s ease, border-color 0.2s ease;
  }
  .map-link:hover { color: var(--g-ink); border-bottom-color: var(--g-hair); }
  .map-canvas { height: clamp(320px, 46vh, 520px); }
  .map-state {
    height: clamp(320px, 46vh, 520px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--g-faint);
  }
  .map-state.error { color: var(--swal-danger, #b91c1c); }
  .bar { width: 130px; height: 1px; background: color-mix(in srgb, var(--g-ink) 10%, transparent); overflow: hidden; }
  .bar i { display: block; width: 40%; height: 100%; background: var(--g-ink); animation: sweep 1.4s ease-in-out infinite; }
  @keyframes sweep { 0% { transform: translateX(-110%); } 100% { transform: translateX(320%); } }
  .map-modal {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .map-backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: color-mix(in srgb, var(--g-ink) 12%, transparent);
    cursor: default;
  }
  .map-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    max-width: 340px;
    width: 100%;
    background: var(--g-paper);
    border-radius: 10px;
    padding: 20px 22px;
    box-shadow: 0 24px 60px color-mix(in srgb, var(--g-ink) 18%, transparent);
  }
  .map-card-type { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--g-faint); }
  .map-card strong { color: var(--g-ink); font-size: 18px; font-weight: 500; line-height: 1.25; }
  .map-card-meta { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--g-faint); }
  .map-card-actions { display: flex; gap: 16px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
  .map-cta {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--g-ink);
    text-decoration: none;
    border-bottom: 1px solid var(--g-hair);
    padding-bottom: 2px;
  }
  .map-cta:hover { border-color: var(--g-ink); }
  .map-btn {
    background: none;
    border: 0;
    padding: 0;
    font-family: inherit;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--g-faint);
    cursor: pointer;
  }
  .map-btn:hover { color: var(--g-ink); }
  .map-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    max-width: 1280px;
    margin-inline: auto;
    box-sizing: border-box;
    padding: 14px 16px 20px;
    border-top: 1px solid color-mix(in srgb, var(--g-ink) 9%, transparent);
  }
  .legend-item { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.13em; color: var(--g-faint); }
  .legend-item .n { color: var(--g-muted); margin-left: 5px; }
  @media (max-width: 680px) {
    .map-head { padding: 16px 16px 0; gap: 10px; }
    .map-link { margin-left: 0; }
    .map-legend { padding: 12px 16px 16px; gap: 5px 14px; }
  }
</style>
