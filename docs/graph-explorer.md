---
title: "Explorador de Grafos"
description: "Visualización interactiva de las conexiones entre recetas, ingredientes y regiones"
---

# 🔗 Explorador de Nodos GOS

<div id="graph-controls" style="margin-bottom: 20px; padding: 16px; border: 3px solid #0a0a0a; background: #fafafa;">
  <label style="font-family: 'Space Mono', monospace; font-weight: bold; text-transform: uppercase;">
    FILTRAR POR TIPO:
  </label>
  <select id="type-filter" style="font-family: 'Space Mono', monospace; border: 2px solid #0a0a0a; padding: 8px; background: white;">
    <option value="all">TODOS</option>
    <option value="recipe">RECETAS</option>
    <option value="ingredient">INGREDIENTES</option>
    <option value="region">REGIONES</option>
  </select>

  <input type="text" id="search-input" placeholder="BUSCAR..."
    style="font-family: 'Space Mono', monospace; border: 2px solid #0a0a0a; padding: 8px; margin-left: 16px; width: 200px;">

  <button id="reset-btn" style="font-family: 'Space Mono', monospace; font-weight: bold; border: 3px solid #0a0a0a; padding: 8px 16px; background: #ffe600; cursor: pointer; margin-left: 16px;">
    RESET
  </button>
</div>

<div id="graph-container" style="width: 100%; height: 600px; border: 5px solid #0a0a0a; background: #0a0a0a;"></div>

<div id="node-info" style="margin-top: 20px; padding: 16px; border: 3px solid #0a0a0a; background: #fafafa; display: none;">
  <h3 id="node-title" style="margin: 0 0 8px 0; font-family: 'Space Mono', monospace;">—</h3>
  <p id="node-details" style="margin: 0; font-family: monospace;"></p>
</div>

<div id="legend" style="margin-top: 20px; display: flex; gap: 24px; flex-wrap: wrap;">
  <span style="display: flex; align-items: center; gap: 8px;">
    <span style="width: 16px; height: 16px; background: #ff2d2d; border: 2px solid #0a0a0a;"></span>
    <span style="font-family: 'Space Mono', monospace; text-transform: uppercase;">Recetas</span>
  </span>
  <span style="display: flex; align-items: center; gap: 8px;">
    <span style="width: 16px; height: 16px; background: #00ff66; border: 2px solid #0a0a0a;"></span>
    <span style="font-family: 'Space Mono', monospace; text-transform: uppercase;">Ingredientes</span>
  </span>
  <span style="display: flex; align-items: center; gap: 8px;">
    <span style="width: 16px; height: 16px; background: #0066ff; border: 2px solid #0a0a0a;"></span>
    <span style="font-family: 'Space Mono', monospace; text-transform: uppercase;">Regiones</span>
  </span>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
(function() {
  const container = document.getElementById('graph-container');
  const width = container.clientWidth;
  const height = 600;

  // Create SVG
  const svg = d3.select('#graph-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', '#0a0a0a');

  // Add zoom behavior
  const g = svg.append('g');
  svg.call(d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => g.attr('transform', event.transform)));

  // Load graph data
  fetch('/graph.json')
    .then(r => r.json())
    .then(data => {
      const nodes = data.nodes;
      const links = data.edges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type
      }));

      // Create force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.size + 5));

      // Draw links
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#444')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.6);

      // Draw nodes
      const node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => d.size)
        .attr('fill', d => d.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .call(drag(simulation));

      // Add labels
      const label = g.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .text(d => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label)
        .attr('font-family', 'Space Mono, monospace')
        .attr('font-size', '10px')
        .attr('fill', '#fff')
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.size + 12);

      // Node click handler
      node.on('click', (event, d) => {
        const info = document.getElementById('node-info');
        const title = document.getElementById('node-title');
        const details = document.getElementById('node-details');

        info.style.display = 'block';
        title.textContent = `[${d.type.toUpperCase()}] ${d.label}`;

        let detailsText = '';
        if (d.type === 'ingredient') {
          detailsText = `Grupo: ${d.group || 'N/A'} | Científico: ${d.scientific_name || 'N/A'}`;
        } else if (d.type === 'recipe') {
          detailsText = `Región: ${d.region || 'N/A'} | Path: ${d.path || 'N/A'}`;
        } else {
          detailsText = `Tipo: ${d.type}`;
        }
        details.textContent = detailsText;
      });

      // Update positions on tick
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);

        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });

      // Drag behavior
      function drag(simulation) {
        return d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          });
      }

      // Filter controls
      document.getElementById('type-filter').addEventListener('change', (e) => {
        const type = e.target.value;
        node.style('opacity', d => type === 'all' || d.type === type ? 1 : 0.1);
        label.style('opacity', d => type === 'all' || d.type === type ? 1 : 0.1);
      });

      document.getElementById('search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        node.style('opacity', d => d.label.toLowerCase().includes(query) ? 1 : 0.2);
        label.style('opacity', d => d.label.toLowerCase().includes(query) ? 1 : 0.2);
      });

      document.getElementById('reset-btn').addEventListener('click', () => {
        node.style('opacity', 1);
        label.style('opacity', 1);
        document.getElementById('type-filter').value = 'all';
        document.getElementById('search-input').value = '';
        document.getElementById('node-info').style.display = 'none';
      });

      // Update meta info
      console.log('Graph loaded:', data.meta);
    })
    .catch(err => {
      console.error('Error loading graph:', err);
      container.innerHTML = '<p style="color: #ff2d2d; font-family: monospace; padding: 20px;">ERROR: No se pudo cargar graph.json. Ejecuta: python scripts/generate_graph.py</p>';
    });
})();
</script>

---

## 🔧 Instrucciones

1. **Generar datos del grafo:**
   ```bash
   python scripts/generate_graph.py
   ```

2. **Interactuar:**
   - 🖱️ **Click** en un nodo para ver detalles
   - 🔍 **Zoom** con scroll del mouse
   - ✋ **Arrastrar** nodos para reorganizar
   - 🔎 **Buscar** por nombre en el campo de texto
   - 📊 **Filtrar** por tipo de nodo

---

## 📊 Estadísticas

El grafo conecta:

- **Recetas** (rojo) con sus **ingredientes** (verde)
- **Recetas** con sus **regiones** de origen (azul)
- **Ingredientes** con sus **sustitutos** potenciales
