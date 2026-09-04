<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  let container: HTMLDivElement;
  let stats = $state({ nodes: 0, edges: 0, recipes: 0, ingredients: 0 });
  let loading = $state(true);
  let error = $state<string|null>(null);

  const COLORS: Record<string,string> = {
    recipe: '#FF6B6B', ingredient: '#4ECDC4', vitamin: '#F9C74F', nutrient: '#F9C74F',
    flavor: '#95E1D3', texture: '#F38181', technique: '#AA96DA', region: '#FFE66D',
    place: '#B2E2F2', category: '#A8D8A8', condition: '#F94144', substance: '#9D4EDD', diet: '#06D6A0'
  };

  // D3 imported statically above — no race condition with <script> CDN load
  function loadD3(): any { return d3; }

  async function loadGraphData(): Promise<any> {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const candidates = [
      `${base}/graph-data.json`,
      '/graph-data.json',
      `./graph-data.json`,
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url);
        if (r.ok) return await r.json();
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
        recipes: data.nodes?.filter((n:any)=>n.type==='recipe').length || 0,
        ingredients: data.nodes?.filter((n:any)=>n.type==='ingredient').length || 0
      };
      const d3lib = loadD3();
      if (container) renderD3(container, data, d3lib);
      loading = false;
    } catch (e:any) { error = e.message; loading = false; }
  });

  function renderD3(el: HTMLDivElement, data: any, d3: any) {
    if (!d3) return;
    const nodes = data.nodes.slice(0, 250);
    const edges = data.edges
      .filter((e:any) => nodes.find((n:any) => n.id === e.source) && nodes.find((n:any) => n.id === e.target))
      .slice(0, 600);
    const width = el.clientWidth || 900;
    const height = 480;
    el.innerHTML = '';
    const svg = d3.select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);
    const g = svg.append('g');
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d:any) => d.id).distance(40))
      .force('charge', d3.forceManyBody().strength(-130))
      .force('center', d3.forceCenter(width / 2, height / 2));
    const link = g.selectAll('line').data(edges).join('line')
      .attr('stroke', '#2A2A3E')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 0.7);
    const node = g.selectAll('circle').data(nodes).join('circle')
      .attr('r', (d:any) => d.size ? Math.max(4, Math.min(10, d.size / 2.5)) : 6)
      .attr('fill', (d:any) => COLORS[d.type] || '#888')
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1)
      .call(d3.drag()
        .on('start', (e:any, d:any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e:any, d:any) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e:any, d:any) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
    node.append('title').text((d:any) => `${d.label} [${d.type}]`);
    sim.on('tick', () => {
      link.attr('x1', (d:any) => d.source.x).attr('y1', (d:any) => d.source.y)
        .attr('x2', (d:any) => d.target.x).attr('y2', (d:any) => d.target.y);
      node.attr('cx', (d:any) => d.x).attr('cy', (d:any) => d.y);
    });
    svg.call(d3.zoom().on('zoom', (e:any) => g.attr('transform', e.transform)));
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