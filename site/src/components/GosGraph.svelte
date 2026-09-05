<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Network } from 'vis-network/peer';
  import { DataSet } from 'vis-data/peer';
  import type { Edge, Node, Options } from 'vis-network/peer';

  // Shared graph types for the explorer (issue #235)
  interface GNodeDatum {
    id: string;
    label?: string;
    type?: string;
    size?: number;
  }
  interface GEdgeDatum {
    source: string;
    target: string;
  }
  interface GraphData {
    nodes: GNodeDatum[];
    edges: GEdgeDatum[];
  }

  let container: HTMLDivElement;
  let stats = $state({ nodes: 0, edges: 0, recipes: 0, ingredients: 0 });
  let loading = $state(true);
  let error = $state<string|null>(null);

  const COLORS: Record<string,string> = {
    recipe: '#FF6B6B', ingredient: '#4ECDC4', vitamin: '#F9C74F', nutrient: '#F9C74F',
    flavor: '#FFE66D', texture: '#F38181', technique: '#AA96DA', region: '#7D61FF',
    place: '#B2E2F2', category: '#90BE6D', condition: '#F94144', substance: '#9D4EDD', diet: '#06D6A0'
  };

  async function loadGraphData(): Promise<GraphData> {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const candidates = [
      `${base}/graph-data.json`,
      '/graph-data.json',
      `./graph-data.json`,
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url);
        if (r.ok) return (await r.json()) as GraphData;
      } catch {}
    }
    throw new Error('graph-data.json no encontrado');
  }

  onMount(async () => {
    try {
      const data = await loadGraphData();
      stats = {
        nodes: data.nodes?.length || 0,
        edges: data.edges?.length || 0,
        recipes: data.nodes?.filter((n)=>n.type==='recipe').length || 0,
        ingredients: data.nodes?.filter((n)=>n.type==='ingredient').length || 0
      };
      loading = false;
      await tick();
      if (container) renderVisNetwork(container, data);
      else error = 'graph container not mounted';
    } catch (e) { error = e instanceof Error ? e.message : String(e); loading = false; }
  });

  function renderVisNetwork(el: HTMLDivElement, data: GraphData) {
    const nodes: Node[] = (data.nodes || []).slice(0, 180).map((n) => ({
      id: n.id,
      label: n.label || n.id,
      shape: 'dot',
      size: n.size ? Math.max(8, Math.min(20, n.size / 2)) : 10,
      color: {
        background: COLORS[n.type || ''] || '#888888',
        border: '#000000',
        highlight: { background: COLORS[n.type || ''] || '#888888', border: '#ffffff' }
      },
      font: { color: '#e0e0ff', size: 10, face: 'Inter, system-ui, sans-serif' }
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: Edge[] = (data.edges || [])
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .slice(0, 350)
      .map((e) => ({
        from: e.source,
        to: e.target,
        color: { color: '#2a2a3e', opacity: 0.4 },
        width: 1
      }));

    const visData = {
      nodes: new DataSet(nodes),
      edges: new DataSet(edges)
    };

    const options: Options = {
      nodes: { borderWidth: 1 },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5,
        },
      },
      interaction: { hover: true, tooltipDelay: 200 },
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: { gravitationalConstant: -30, centralGravity: 0.01, springLength: 60, springConstant: 0.08 },
        maxVelocity: 40,
        minVelocity: 0.75,
        stabilization: { enabled: true, iterations: 100 }
      }
    };

    const network = new Network(el, visData, options);

    network.on('stabilizationIterationsDone', () => {
      network.setOptions({ physics: { enabled: false } });
    });

    setTimeout(() => {
      network.setOptions({ physics: { enabled: false } });
    }, 2500);

    // Clicking a node in homepage mini-graph navigates to /graph?node=<node_id>
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        window.location.href = `${base}/graph?node=${encodeURIComponent(nodeId)}`;
      }
    });
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
