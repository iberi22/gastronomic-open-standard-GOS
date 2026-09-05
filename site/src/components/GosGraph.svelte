<script lang="ts">
import Graph from 'graphology'
import type { Sigma as SigmaType } from 'sigma'
import Sigma from 'sigma'
import { onMount, tick } from 'svelte'

// Shared graph types for the explorer
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

let container: HTMLDivElement
let renderer: SigmaType | null = null
let stats = $state({ nodes: 0, edges: 0, recipes: 0, ingredients: 0 })
let loading = $state(true)
let error = $state<string | null>(null)

const COLORS: Record<string, string> = {
  recipe: '#FF6B6B',
  ingredient: '#4ECDC4',
  vitamin: '#F9C74F',
  nutrient: '#F9C74F',
  flavor: '#FFE66D',
  texture: '#F38181',
  technique: '#AA96DA',
  region: '#7D61FF',
  place: '#B2E2F2',
  category: '#90BE6D',
  condition: '#F94144',
  substance: '#9D4EDD',
  diet: '#06D6A0',
}

async function loadGraphData(): Promise<GraphData> {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const candidates = [
    `${base}/graph-data.json`,
    '/graph-data.json',
    `./graph-data.json`,
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
      const data = await loadGraphData()
      stats = {
        nodes: data.nodes?.length || 0,
        edges: data.edges?.length || 0,
        recipes: data.nodes?.filter((n) => n.type === 'recipe').length || 0,
        ingredients:
          data.nodes?.filter((n) => n.type === 'ingredient').length || 0,
      }
      loading = false
      await tick()
      if (container) renderSigma(container, data)
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

function renderSigma(el: HTMLDivElement, data: GraphData) {
  // Mini-grafo home: muestra estratificada por tipo con posiciones FA2
  // precomputadas (build). Cero fisica en cliente: render WebGL estatico.
  const byType = new Map<string, GNodeDatum[]>()
  for (const n of data.nodes || []) {
    const t = n.type || 'misc'
    const list = byType.get(t)
    if (list) list.push(n)
    else byType.set(t, [n])
  }
  const PER_TYPE = 14
  const subset: GNodeDatum[] = []
  for (const list of byType.values()) {
    const step = Math.max(1, Math.floor(list.length / PER_TYPE))
    for (let i = 0; i < list.length && subset.length < 180; i += step) {
      subset.push(list[i])
      if (subset.filter((s) => s.type === list[i].type).length >= PER_TYPE)
        break
    }
  }
  const nodeIds = new Set(subset.map((n) => n.id))
  const g = new Graph({ multi: true })
  subset.forEach((n, i) => {
    g.addNode(n.id, {
      label: n.label || n.id,
      size: n.size ? Math.max(4, Math.min(10, n.size / 2)) : 5,
      color: COLORS[n.type || ''] || '#888888',
      x: typeof n.x === 'number' ? n.x : Math.cos(i) * 10,
      y: typeof n.y === 'number' ? n.y : Math.sin(i) * 10,
    })
  })
  ;(data.edges || [])
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .slice(0, 350)
    .forEach((e) => {
      try {
        g.addEdge(e.source, e.target, { color: '#2a2a3e', size: 1 })
      } catch {}
    })

  renderer?.kill()
  renderer = new Sigma(g, el, {
    defaultEdgeColor: '#2a2a3e',
    defaultEdgeType: 'line',
    labelRenderedSizeThreshold: 99999,
    minCameraRatio: 0.05,
    maxCameraRatio: 3,
  })

  // Click en mini-grafo home navega a /graph?node=<id>
  renderer.on('clickNode', (e) => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    window.location.href = `${base}/graph?node=${encodeURIComponent(e.node)}`
  })
}
</script>
<div class="gos-graph-wrap">
  <div class="gos-toolbar">
    <div class="gos-toolbar-left">
      <span class="gos-title">GOS Knowledge Graph</span>
      <span class="gos-stats">{stats.nodes} nodos • {stats.edges} aristas • {stats.recipes} recetas</span>
    </div>
    <div class="gos-toolbar-right">
      <a href={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/graph`} class="gos-btn primary">Ver grafo completo →</a>
    </div>
  </div>
  {#if loading}
    <div class="gos-loading">
      <div class="spinner"></div>
      <span>Cargando grafo global (recetas ↔ ingredientes ↔ vitaminas ↔ afecciones)...</span>
    </div>
  {:else if error}
    <div class="gos-error">No se pudo cargar: {error}</div>
  {:else}
    <div bind:this={container} class="gos-canvas"></div>
  {/if}
  <div class="gos-legend">
    {#each Object.entries(COLORS) as [k, c]}
      <span class="legend-item"><span class="dot" style={`background:${c}`}></span>{k}</span>
    {/each}
  </div>
</div>

<style>
  .gos-graph-wrap {
    border: 1px solid var(--swal-border);
    border-radius: 16px;
    overflow: hidden;
    background: var(--swal-surface);
  }
  .gos-toolbar {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--swal-border);
    background: color-mix(in srgb, var(--swal-bg) 70%, var(--swal-surface));
  }
  .gos-title {
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--swal-accent);
  }
  .gos-stats {
    font-size: 11px;
    color: var(--swal-text-muted);
    margin-left: 12px;
  }
  .gos-btn {
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--swal-border);
    color: var(--swal-text);
    text-decoration: none;
  }
  .gos-btn.primary {
    background: var(--swal-accent);
    color: white;
    border-color: var(--swal-accent);
  }
  .gos-canvas {
    height: 480px;
    background: radial-gradient(ellipse at top, color-mix(in srgb, var(--swal-accent) 8%, transparent), transparent 60%), var(--swal-bg);
  }
  .gos-loading {
    height: 480px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    justify-content: center;
    color: var(--swal-text-muted);
    font-size: 13px;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--swal-border);
    border-top-color: var(--swal-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .gos-error {
    padding: 32px;
    color: var(--swal-danger);
    text-align: center;
  }
  .gos-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 16px;
    border-top: 1px solid var(--swal-border);
    background: var(--swal-surface);
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--swal-text-secondary);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
</style>
