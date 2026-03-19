---
title: "Explorador de Grafos"
description: "Visualización interactiva de las conexiones entre recetas, ingredientes y regiones"
---

# 🔗 Explorador de Nodos GOS

<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
</style>

<div id="graph-controls" style="margin-bottom: 20px; padding: 16px; border: 3px solid #0a0a0a; background: #fafafa;">
  <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
    <label style="font-family: 'Space Mono', monospace; font-weight: bold; text-transform: uppercase;">
      FILTRAR:
    </label>

    <select id="type-filter" style="font-family: 'Space Mono', monospace; border: 2px solid #0a0a0a; padding: 8px; background: white;">
      <option value="all">TIPO: TODOS</option>
      <option value="recipe">RECETAS</option>
      <option value="ingredient">INGREDIENTES</option>
      <option value="region">REGIONES</option>
      <option value="flavor"> SABORES</option>
    </select>

    <select id="region-filter" style="font-family: 'Space Mono', monospace; border: 2px solid #0a0a0a; padding: 8px; background: white;">
      <option value="all">REGIÓN: TODAS</option>
      <option value="china">CHINA</option>
      <option value="colombian">COLOMBIAN</option>
      <option value="peruvian">PERUVIAN</option>
    </select>

    <select id="category-filter" style="font-family: 'Space Mono', monospace; border: 2px solid #0a0a0a; padding: 8px; background: white;">
      <option value="all">CATEGORÍA: TODAS</option>
      <option value="protein">PROTEÍNAS</option>
      <option value="vegetable">VEGETALES</option>
      <option value="grain">GRANOS</option>
      <option value="dairy">LÁCTEOS</option>
      <option value="condiment">CONDIMENTOS</option>
      <option value="fruit">FRUTAS</option>
      <option value="oil">ACEITES</option>
    </select>

    <select id="technique-filter" style="font-family: 'Space Mono', monospace; border: 2px solid #0a0a0a; padding: 8px; background: white;">
      <option value="all">TÉCNICA: TODAS</option>
      <option value="fried">FRITO</option>
      <option value="boiled">HERVIDO</option>
      <option value="grilled">ASADO</option>
      <option value="steamed">VAPOR</option>
      <option value="raw">CRUDO</option>
    </select>

    <input type="text" id="search-input" placeholder="BUSCAR..."
      style="font-family: 'Space Mono', monospace; border: 2px solid #0a0a0a; padding: 8px; width: 200px;">

    <button id="reset-btn" style="font-family: 'Space Mono', monospace; font-weight: bold; border: 3px solid #0a0a0a; padding: 8px 16px; background: #ffe600; cursor: pointer;">
      RESET
    </button>
  </div>
</div>

<div id="graph-container" style="width: 100%; height: 600px; border: 5px solid #0a0a0a; background: #0a0a0a;"></div>

<div id="node-info" style="margin-top: 20px; padding: 16px; border: 3px solid #0a0a0a; background: #fafafa; display: none;">
  <h3 id="node-title" style="margin: 0 0 8px 0; font-family: 'Space Mono', monospace; text-transform: uppercase;">—</h3>
  <div id="node-details" style="font-family: monospace;"></div>
  <div id="node-nutrition" style="margin-top: 12px; padding-top: 12px; border-top: 2px dashed #0a0a0a; font-family: monospace; display: none;">
    <strong style="font-family: 'Space Mono', monospace;">DATOS NUTRICIONALES:</strong>
    <div id="nutrition-content" style="margin-top: 8px;"></div>
  </div>
</div>

<div id="legend" style="margin-top: 20px; padding: 16px; border: 3px solid #0a0a0a; background: #fafafa;">
  <h4 style="margin: 0 0 12px 0; font-family: 'Space Mono', monospace; text-transform: uppercase;">LEYENDA</h4>

  <div style="display: flex; flex-wrap: wrap; gap: 24px;">
    <!-- Node Types -->
    <div>
      <strong style="font-family: 'Space Mono', monospace; font-size: 11px;">TIPOS DE NODOS:</strong>
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 18px; height: 18px; background: #ff2d2d; border: 2px solid #0a0a0a;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Recetas</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 18px; height: 18px; background: #00ff66; border: 2px solid #0a0a0a;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Ingredientes</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 18px; height: 18px; background: #0066ff; border: 2px solid #0a0a0a;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Regiones</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 18px; height: 18px; background: #ff66ff; border: 2px solid #0a0a0a;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Sabores</span>
        </span>
      </div>
    </div>

    <!-- Node Sizes -->
    <div>
      <strong style="font-family: 'Space Mono', monospace; font-size: 11px;">TAMAÑOS:</strong>
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; background: #fff; border: 1px solid #0a0a0a;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Bajo valor (5)</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 14px; height: 14px; background: #fff; border: 1px solid #0a0a0a;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Medio valor (10)</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 22px; height: 22px; background: #fff; border: 1px solid #0a0a0a;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Alto valor (15+)</span>
        </span>
      </div>
    </div>

    <!-- Edge Colors -->
    <div>
      <strong style="font-family: 'Space Mono', monospace; font-size: 11px;">CONEXIONES:</strong>
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 24px; height: 3px; background: #ff6b6b;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">USA (receta → ingrediente)</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 24px; height: 3px; background: #4ecdc4;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">DESDE (receta → región)</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 24px; height: 3px; background: #ffe66d;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">SUSTITUTO</span>
        </span>
      </div>
    </div>

    <!-- Regions -->
    <div>
      <strong style="font-family: 'Space Mono', monospace; font-size: 11px;">AGRUPACIÓN:</strong>
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 12px; height: 12px; border: 2px dashed #ff2d2d; border-radius: 50%;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Cluster Colombia</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 12px; height: 12px; border: 2px dashed #0066ff; border-radius: 50%;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Cluster China</span>
        </span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 12px; height: 12px; border: 2px dashed #00ff66; border-radius: 50%;"></span>
          <span style="font-family: 'Space Mono', monospace; font-size: 11px;">Cluster Perú</span>
        </span>
      </div>
    </div>
  </div>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
(function() {
  const container = document.getElementById('graph-container');
  const width = container.clientWidth;
  const height = 600;

  // Color schemes
  const typeColors = {
    recipe: '#ff2d2d',
    ingredient: '#00ff66',
    region: '#0066ff',
    flavor: '#ff66ff'
  };

  const edgeColors = {
    USES: '#ff6b6b',
    FROM: '#4ecdc4',
    SUBSTITUTES: '#ffe66d'
  };

  const regionClusters = {
    china: { color: '#0066ff', x: width * 0.2 },
    colombian: { color: '#ff2d2d', x: width * 0.5 },
    peruvian: { color: '#00ff66', x: width * 0.8 }
  };

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

      // Determine region for clustering
      nodes.forEach(node => {
        if (node.type === 'region') {
          const id = node.id.toLowerCase();
          if (id.includes('china')) node.cluster = 'china';
          else if (id.includes('colombia') || id.includes('colombian')) node.cluster = 'colombian';
          else if (id.includes('peru') || id.includes('peruvian')) node.cluster = 'peruvian';
          else node.cluster = 'other';
        } else if (node.type === 'recipe') {
          const region = (node.region || '').toLowerCase();
          if (region.includes('china') || node.id.toLowerCase().includes('china')) node.cluster = 'china';
          else if (region.includes('colombia') || region.includes('andina') || region.includes('caribe') ||
                   region.includes('orin') || region.includes('amazon') || region.includes('pacific') ||
                   region.includes('insular')) node.cluster = 'colombian';
          else if (region.includes('peru') || region.includes('costa') || region.includes('sierra') ||
                   region.includes('selva')) node.cluster = 'peruvian';
          else node.cluster = 'other';
        }
      });

      // Create force simulation with clustering
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.val + 10))
        .force('x', d3.forceX(d => {
          if (d.cluster === 'china') return width * 0.25;
          if (d.cluster === 'colombian') return width * 0.5;
          if (d.cluster === 'peruvian') return width * 0.75;
          return width / 2;
        }).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.05));

      // Draw links with different colors based on type
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', d => edgeColors[d.type] || '#666')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.7);

      // Draw cluster regions
      const clusterGroups = ['china', 'colombian', 'peruvian'];
      clusterGroups.forEach(cluster => {
        const clusterData = regionClusters[cluster];
        g.append('circle')
          .attr('cx', clusterData.x)
          .attr('cy', height / 2)
          .attr('r', 180)
          .attr('fill', 'none')
          .attr('stroke', clusterData.color)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '8,4')
          .attr('opacity', 0.3);
      });

      // Draw nodes
      const node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => Math.max(5, Math.min(d.val || 8, 25)))
        .attr('fill', d => typeColors[d.type] || '#888')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .call(drag(simulation));

      // Add labels
      const label = g.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .text(d => d.label.length > 12 ? d.label.substring(0, 12) + '…' : d.label)
        .attr('font-family', 'Space Mono, monospace')
        .attr('font-size', '9px')
        .attr('fill', '#fff')
        .attr('text-anchor', 'middle')
        .attr('dy', d => Math.max(5, Math.min(d.val || 8, 25)) + 10);

      // Node click handler - enhanced info panel
      node.on('click', (event, d) => {
        const info = document.getElementById('node-info');
        const title = document.getElementById('node-title');
        const details = document.getElementById('node-details');
        const nutritionDiv = document.getElementById('node-nutrition');
        const nutritionContent = document.getElementById('nutrition-content');

        info.style.display = 'block';
        title.textContent = `[${d.type.toUpperCase()}] ${d.label}`;

        let detailsHTML = '';

        if (d.type === 'ingredient') {
          detailsHTML = `
            <div style="margin-bottom: 8px;">
              <strong>Nombre científico:</strong> ${d.scientific_name || 'N/A'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Grupo:</strong> ${d.group || d.category || 'N/A'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Categoría:</strong> ${d.ingredient_category || 'N/A'}
            </div>
          `;
        } else if (d.type === 'recipe') {
          detailsHTML = `
            <div style="margin-bottom: 8px;">
              <strong>Región:</strong> ${d.region || 'N/A'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Path:</strong> <code>${d.path || 'N/A'}</code>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Técnica:</strong> ${d.technique || 'N/A'}
            </div>
          `;
        } else if (d.type === 'region') {
          detailsHTML = `
            <div style="margin-bottom: 8px;">
              <strong>Tipo de región:</strong> ${d.region_type || 'N/A'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Cluster:</strong> ${d.cluster || 'N/A'}
            </div>
          `;
        } else {
          detailsHTML = `<div><strong>Tipo:</strong> ${d.type}</div>`;
        }

        details.innerHTML = detailsHTML;

        // Nutritional data
        if (d.nutritional_data || (d.calories && d.protein && d.carbs && d.fat)) {
          const nut = d.nutritional_data || { calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat };
          nutritionContent.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
              <div style="padding: 8px; border: 2px solid #0a0a0a; text-align: center;">
                <div style="font-size: 16px; font-weight: bold;">${nut.calories || '—'}</div>
                <div style="font-size: 9px;">CALORÍAS</div>
              </div>
              <div style="padding: 8px; border: 2px solid #0a0a0a; text-align: center;">
                <div style="font-size: 16px; font-weight: bold;">${nut.protein || '—'}g</div>
                <div style="font-size: 9px;">PROTEÍNA</div>
              </div>
              <div style="padding: 8px; border: 2px solid #0a0a0a; text-align: center;">
                <div style="font-size: 16px; font-weight: bold;">${nut.carbs || '—'}g</div>
                <div style="font-size: 9px;">CARBS</div>
              </div>
              <div style="padding: 8px; border: 2px solid #0a0a0a; text-align: center;">
                <div style="font-size: 16px; font-weight: bold;">${nut.fat || '—'}g</div>
                <div style="font-size: 9px;">GRASA</div>
              </div>
            </div>
          `;
          nutritionDiv.style.display = 'block';
        } else {
          nutritionDiv.style.display = 'none';
        }
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

      // Enhanced filter controls
      function applyFilters() {
        const typeVal = document.getElementById('type-filter').value;
        const regionVal = document.getElementById('region-filter').value;
        const categoryVal = document.getElementById('category-filter').value;
        const techniqueVal = document.getElementById('technique-filter').value;
        const searchVal = document.getElementById('search-input').value.toLowerCase();

        node.style('opacity', d => {
          // Type filter
          if (typeVal !== 'all' && d.type !== typeVal) return 0.1;

          // Region filter
          if (regionVal !== 'all') {
            const nodeRegion = (d.region || d.id || '').toLowerCase();
            if (!nodeRegion.includes(regionVal) && d.cluster !== regionVal) return 0.1;
          }

          // Category filter (for ingredients)
          if (categoryVal !== 'all' && d.type === 'ingredient') {
            const cat = (d.category || d.group || '').toLowerCase();
            if (!cat.includes(categoryVal)) return 0.1;
          }

          // Technique filter (for recipes)
          if (techniqueVal !== 'all' && d.type === 'recipe') {
            const tech = (d.technique || '').toLowerCase();
            if (!tech.includes(techniqueVal)) return 0.1;
          }

          // Search filter
          if (searchVal && !d.label.toLowerCase().includes(searchVal)) return 0.1;

          return 1;
        });

        label.style('opacity', d => {
          // Type filter
          if (typeVal !== 'all' && d.type !== typeVal) return 0.1;

          // Region filter
          if (regionVal !== 'all') {
            const nodeRegion = (d.region || d.id || '').toLowerCase();
            if (!nodeRegion.includes(regionVal) && d.cluster !== regionVal) return 0.1;
          }

          // Category filter
          if (categoryVal !== 'all' && d.type === 'ingredient') {
            const cat = (d.category || d.group || '').toLowerCase();
            if (!cat.includes(categoryVal)) return 0.1;
          }

          // Technique filter
          if (techniqueVal !== 'all' && d.type === 'recipe') {
            const tech = (d.technique || '').toLowerCase();
            if (!tech.includes(techniqueVal)) return 0.1;
          }

          // Search filter
          if (searchVal && !d.label.toLowerCase().includes(searchVal)) return 0.1;

          return 1;
        });

        // Also filter links based on visible nodes
        const visibleNodes = new Set(nodes.filter(d => {
          if (typeVal !== 'all' && d.type !== typeVal) return false;
          if (regionVal !== 'all') {
            const nodeRegion = (d.region || d.id || '').toLowerCase();
            if (!nodeRegion.includes(regionVal) && d.cluster !== regionVal) return false;
          }
          if (categoryVal !== 'all' && d.type === 'ingredient') {
            const cat = (d.category || d.group || '').toLowerCase();
            if (!cat.includes(categoryVal)) return false;
          }
          if (techniqueVal !== 'all' && d.type === 'recipe') {
            const tech = (d.technique || '').toLowerCase();
            if (!tech.includes(techniqueVal)) return false;
          }
          if (searchVal && !d.label.toLowerCase().includes(searchVal)) return false;
          return true;
        }).map(d => d.id));

        link.style('opacity', d => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          return (visibleNodes.has(sourceId) && visibleNodes.has(targetId)) ? 0.7 : 0.1;
        });
      }

      // Attach filter event listeners
      document.getElementById('type-filter').addEventListener('change', applyFilters);
      document.getElementById('region-filter').addEventListener('change', applyFilters);
      document.getElementById('category-filter').addEventListener('change', applyFilters);
      document.getElementById('technique-filter').addEventListener('change', applyFilters);
      document.getElementById('search-input').addEventListener('input', applyFilters);

      // Reset button
      document.getElementById('reset-btn').addEventListener('click', () => {
        document.getElementById('type-filter').value = 'all';
        document.getElementById('region-filter').value = 'all';
        document.getElementById('category-filter').value = 'all';
        document.getElementById('technique-filter').value = 'all';
        document.getElementById('search-input').value = '';
        document.getElementById('node-info').style.display = 'none';

        node.style('opacity', 1);
        label.style('opacity', 1);
        link.style('opacity', 0.7);
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
   - 🖱️ **Click** en un nodo para ver detalles completos
   - 🔍 **Zoom** con scroll del mouse
   - ✋ **Arrastrar** nodos para reorganizar
   - 🔎 **Buscar** por nombre en el campo de texto
   - 📊 **Filtrar** por tipo, región, categoría o técnica

3. **Filtros disponibles:**
   - **Tipo**: Recetas, Ingredientes, Regiones, Sabores
   - **Región**: China, Colombia, Perú
   - **Categoría**: Proteínas, Vegetales, Granos, Lácteos, Condimentos, Frutas, Aceites
   - **Técnica**: Frito, Hervido, Asado, Vapor, Crudo

---

## 📊 Estadísticas

El grafo conecta:

- **Recetas** (rojo) con sus **ingredientes** (verde)
- **Recetas** con sus **regiones** de origen (azul)
- **Ingredientes** con sus **sustitutos** potenciales
- **Sabores** (magenta) con ingredientes relacionados

### Clustering Regional

Los nodos se agrupan automáticamente por región:
- 🌐 **Cluster China** (izquierda) - recetas y ingredientes chinos
- 🌐 **Cluster Colombia** (centro) - recetas y ingredientes colombianos
- 🌐 **Cluster Perú** (derecha) - recetas y ingredientes peruanos
