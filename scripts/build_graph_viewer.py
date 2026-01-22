
import json
from pathlib import Path

# Paths
GRAPH_JSON_PATH = Path("docs/graph.json")
OUTPUT_HTML_PATH = Path("docs/explorar-grafo-standalone.html")

# The HTML Template (based on v3)
HTML_TEMPLATE_START = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GOS | Obsidian Graph View (Standalone)</title>
    <script src="https://unpkg.com/force-graph"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');

        :root {
            --bg-color: #0b0b0b;
            --sidebar-bg: rgba(20, 20, 20, 0.8);
            --accent-color: #7d61ff; /* Obsidian Purple */
            --text-color: #dcddde;
            --text-muted: #888;
            --border-color: #303030;
        }

        body {
            margin: 0;
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }

        /* --- OBSIDIAN FLOATING UI --- */
        .obsidian-panel {
            position: absolute;
            background: var(--sidebar-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            z-index: 100;
            pointer-events: auto;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }

        #search-panel {
            top: 20px;
            left: 20px;
            width: 280px;
        }

        #info-panel {
            top: 20px;
            right: 20px;
            width: 320px;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        }

        #settings-panel {
            bottom: 20px;
            left: 20px;
            width: 240px;
            font-size: 0.8rem;
        }

        h3 {
            margin: 0 0 12px 0;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }

        input[type="text"], input[type="search"] {
            width: 100%;
            background: #1e1e1e;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px 12px;
            color: white;
            font-family: inherit;
            outline: none;
            margin-bottom: 15px;
        }

        input[type="text"]:focus {
            border-color: var(--accent-color);
        }

        .node-info-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #fff;
            margin-bottom: 5px;
        }

        .node-info-type {
            font-size: 0.75rem;
            color: var(--accent-color);
            text-transform: uppercase;
            margin-bottom: 15px;
            display: block;
        }

        .connection-list {
            list-style: none;
            padding: 0;
            margin: 10px 0;
        }

        .connection-item {
            padding: 6px 0;
            border-bottom: 1px solid #252525;
            font-size: 0.85rem;
            color: #ccc;
            cursor: pointer;
            transition: color 0.2s;
        }

        .connection-item:hover {
            color: var(--accent-color);
        }

        .tag {
            font-size: 0.7rem;
            padding: 2px 6px;
            background: #252525;
            border-radius: 4px;
            margin-right: 5px;
        }

        /* --- GRAPH --- */
        #graph-container {
            width: 100vw;
            height: 100vh;
        }

        .controls-hint {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 0.7rem;
            color: var(--text-muted);
        }
    </style>
</head>
<body>

    <div id="graph-container"></div>

    <!-- UI LAYER -->
    <div id="search-panel" class="obsidian-panel">
        <h3>Explorar Grafo</h3>
        <input type="search" id="search-input" placeholder="Buscar notas, ingredientes...">
        <div id="graph-stats" style="font-size: 0.7rem; color: var(--text-muted);">
            Cargando conocimiento...
        </div>
    </div>

    <div id="info-panel" class="obsidian-panel">
        <div id="node-details">
            <!-- Dynamic Content -->
        </div>
    </div>

    <div id="settings-panel" class="obsidian-panel">
        <h3>Ajustes Visuales</h3>
        <div style="margin-bottom: 10px;">
            Gravitación: <input type="range" id="force-charge" min="-500" max="-50" value="-150" style="width: 100%;">
        </div>
        <div style="margin-bottom: 10px;">
            Distancia: <input type="range" id="force-distance" min="30" max="200" value="80" style="width: 100%;">
        </div>
        <button id="reset-forces" style="width: 100%; background: #252525; color: white; border: none; padding: 5px; border-radius: 4px; cursor: pointer;">Resetear Fuerzas</button>
    </div>

    <div class="controls-hint">
        Scroll para zoom • Arrastrar para mover • Click para detalles
    </div>

    <script>
        const COLORS = {
            recipe: '#ff4b4b',      // Red
            ingredient: '#4ECDC4',  // Teal
            flavor: '#ffe66d',      // Yellow
            texture: '#f38181',     // Coral
            region: '#7d61ff',      // Obsidian Purple / Region
            technique: '#95e1d3',   // Mint
            default: '#888'
        };

        let Graph;
        let fullData = { nodes: [], links: [] };
        const imgCache = {};
        let hoveredNode = null;
        let neighbors = new Set();

        // --- EMBEDDED DATA START ---
"""

HTML_TEMPLATE_END = """
        // --- EMBEDDED DATA END ---

        // Config Data
        fullData = {
            nodes: rawData.nodes.map(n => ({ ...n, val: 5 + (n.size || 5) / 2 })),
            links: rawData.edges.map(e => ({ ...e, source: e.source, target: e.target }))
        };

        // Calc importance
        fullData.nodes.forEach(node => {
            const degree = fullData.links.filter(l => l.source === node.id || l.target === node.id).length;
            node.val = 2 + Math.sqrt(degree) * 2;
        });

        document.getElementById('graph-stats').textContent =
            `${rawData.nodes.length} Nodos • ${rawData.edges.length} Conexiones`;

        initGraph();

        function initGraph() {
            const elem = document.getElementById('graph-container');
            Graph = ForceGraph()(elem)
                .graphData(fullData)
                .backgroundColor('#0b0b0b')
                .nodeId('id')
                .nodeVal('val')
                .nodeColor(node => {
                    if (hoveredNode && node.id !== hoveredNode.id && !neighbors.has(node.id)) return '#1a1a1a';
                    return COLORS[node.type] || COLORS.default;
                })
                .linkColor(link => {
                    if (hoveredNode && (link.source.id === hoveredNode.id || link.target.id === hoveredNode.id)) {
                        return COLORS[hoveredNode.type] || '#fff';
                    }
                    return '#252525';
                })
                .linkWidth(link => (hoveredNode && (link.source.id === hoveredNode.id || link.target.id === hoveredNode.id)) ? 1.5 : 0.5)
                .onNodeHover(node => {
                    elem.style.cursor = node ? 'pointer' : null;
                    if (node === hoveredNode) return;

                    hoveredNode = node;
                    neighbors = new Set();
                    if (node) {
                        fullData.links.forEach(l => {
                            if (l.source.id === node.id) neighbors.add(l.target.id);
                            if (l.target.id === node.id) neighbors.add(l.source.id);
                        });
                    }
                })
                .onNodeClick(node => {
                    showDetails(node);
                    Graph.centerAt(node.x, node.y, 1000);
                    Graph.zoom(3, 1000);
                })
                .nodeCanvasObject((node, ctx, globalScale) => {
                    const label = node.label;
                    const r = node.val;
                    const fontSize = 12 / globalScale;

                    // Visibility logic
                    const isFocus = !hoveredNode || node.id === hoveredNode.id || neighbors.has(node.id);
                    ctx.globalAlpha = isFocus ? 1 : 0.15;

                    // 1. Glow
                    if (node.id === (hoveredNode?.id)) {
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = COLORS[node.type] || '#fff';
                    }

                    // 2. Node Circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                    ctx.fillStyle = COLORS[node.type] || COLORS.default;
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // 3. Image (if zoomed)
                    if (globalScale > 3 && node.image) {
                        if (!imgCache[node.image]) {
                            const img = new Image();
                            img.src = node.image;
                            img.onload = () => { imgCache[node.image] = img; };
                        }
                        const img = imgCache[node.image];
                        if (img) {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                            ctx.clip();
                            ctx.drawImage(img, node.x - r, node.y - r, r * 2, r * 2);
                            ctx.restore();
                        }
                    }

                    // 4. Label
                    if (globalScale > 2.5 || (hoveredNode && node.id === hoveredNode.id)) {
                        ctx.font = `${fontSize}px Inter`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        // Text Background
                        const textWidth = ctx.measureText(label).width;
                        ctx.fillStyle = '#000';
                        ctx.globalAlpha = isFocus ? 0.6 : 0.1;
                        ctx.fillRect(node.x - textWidth/2 - 2, node.y + r + 2, textWidth + 4, fontSize + 2);

                        // Text Foreground
                        ctx.globalAlpha = isFocus ? 1 : 0.2;
                        ctx.fillStyle = isFocus ? '#fff' : '#888';
                        ctx.fillText(label, node.x, node.y + r + fontSize/2 + 4);
                    }

                    ctx.globalAlpha = 1;
                });

            // Bind Controls
            document.getElementById('search-input').addEventListener('input', e => {
                const query = e.target.value.toLowerCase();
                if (query.length < 2) return;
                const found = fullData.nodes.find(n => n.label.toLowerCase().includes(query));
                if (found) {
                    Graph.centerAt(found.x, found.y, 800);
                    Graph.zoom(3, 800);
                    showDetails(found);
                }
            });

            document.getElementById('force-charge').addEventListener('input', e => {
                Graph.d3Force('charge').strength(+e.target.value);
                Graph.numDimensions(2);
            });

            document.getElementById('force-distance').addEventListener('input', e => {
                Graph.d3Force('link').distance(+e.target.value);
                Graph.numDimensions(2);
            });

            document.getElementById('reset-forces').onclick = () => {
                document.getElementById('force-charge').value = -150;
                document.getElementById('force-distance').value = 80;
                Graph.d3Force('charge').strength(-150);
                Graph.d3Force('link').distance(80);
            };
        }

        function showDetails(node) {
            const panel = document.getElementById('info-panel');
            const details = document.getElementById('node-details');
            panel.style.display = 'block';

            let html = `
                <span class="node-info-type">${node.type}</span>
                <div class="node-info-title">${node.label}</div>
            `;

            if (node.region) html += `<div style="margin-bottom: 15px;"><span class="tag">${node.region}</span></div>`;

            const nodeLinks = fullData.links.filter(l => l.source.id === node.id || l.target.id === node.id);

            html += `<h3>Conexiones (${nodeLinks.length})</h3><ul class="connection-list">`;
            nodeLinks.forEach(l => {
                const other = l.source.id === node.id ? l.target : l.source;
                html += `<li class="connection-item" onclick="focusOn('${other.id}')">
                    <span style="color: ${COLORS[other.type] || '#888'}">⬤</span> ${other.label}
                    <div style="font-size: 0.7rem; color: #555; margin-left: 15px;">${l.type}</div>
                </li>`;
            });
            html += `</ul>`;
            details.innerHTML = html;
        }

        function focusOn(id) {
            const node = fullData.nodes.find(n => n.id === id);
            if (node) {
                Graph.centerAt(node.x, node.y, 800);
                Graph.zoom(3, 800);
                showDetails(node);
            }
        }

        window.addEventListener('resize', () => {
            if(Graph) {
                Graph.width(window.innerWidth);
                Graph.height(window.innerHeight);
            }
        });
    </script>
</body>
</html>
"""

def main():
    if not GRAPH_JSON_PATH.exists():
        print(f"Error: {GRAPH_JSON_PATH} not found.")
        return

    print("Loading graph data...")
    graph_data = GRAPH_JSON_PATH.read_text(encoding="utf-8")

    # Create valid JS object string
    js_data = f"const rawData = {graph_data};\n"

    print("Building standalone HTML...")
    full_html = HTML_TEMPLATE_START + js_data + HTML_TEMPLATE_END

    OUTPUT_HTML_PATH.write_text(full_html, encoding="utf-8")
    print(f"Success! Created {OUTPUT_HTML_PATH}")
    print("Open this file directly in browser to view graph without CORS errors.")

if __name__ == "__main__":
    main()
