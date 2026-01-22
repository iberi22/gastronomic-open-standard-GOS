"""
GOS Knowledge Graph Builder
---------------------------
This script parses the repository content (recipes, ingredients) and regenerates:
1. docs/graph.json (Raw Data)
2. docs/explorar-grafo.html (Standalone Interactive Viewer)

This should be run in the CI/CD pipeline before site deployment.
"""

import json
import re
import yaml
from pathlib import Path
from collections import defaultdict

# --- CONFIGURATION ---
ROOT_DIR = Path(".")
DISHES_DIR = ROOT_DIR / "dishes"
INGREDIENTS_DIR = ROOT_DIR / "ingredients"
DOCS_DIR = ROOT_DIR / "docs"
OUTPUT_JSON = DOCS_DIR / "graph.json"
OUTPUT_HTML = DOCS_DIR / "explorar-grafo.html"

# Aesthetic Config (Obsidian Style)
NODE_COLORS = {
    "recipe": "#ff4b4b",      # Red
    "ingredient": "#4ECDC4",  # Teal
    "flavor": "#ffe66d",      # Yellow
    "texture": "#f38181",     # Coral
    "region": "#7d61ff",      # Obsidian Purple
    "technique": "#95e1d3",   # Mint
}

# --- HTML TEMPLATE (Embedded for Standalone usage) ---
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GOS | Red de Conocimiento</title>
    <script src="https://unpkg.com/force-graph"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
        :root { --bg: #0b0b0b; --panel: rgba(20,20,20,0.85); --accent: #7d61ff; --text: #ddd; }
        body { margin: 0; background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; overflow: hidden; }
        .panel { position: absolute; background: var(--panel); backdrop-filter: blur(12px); border: 1px solid #333; border-radius: 8px; padding: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); z-index: 10; }
        #search-panel { top: 20px; left: 20px; width: 300px; }
        #info-panel { top: 20px; right: 20px; width: 320px; display: none; max-height: 80vh; overflow-y: auto; }
        input { width: 100%; background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 4px; outline: none; box-sizing: border-box; }
        input:focus { border-color: var(--accent); }
        h3 { margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase; color: #888; border-bottom: 1px solid #333; padding-bottom: 5px; }
        .tag { font-size: 0.7rem; padding: 2px 6px; background: #222; border-radius: 4px; margin-right: 5px; border: 1px solid #333; }
        .cx-item { padding: 8px 0; border-bottom: 1px solid #222; cursor: pointer; font-size: 0.85rem; display: flex; justify-content: space-between; }
        .cx-item:hover { color: var(--accent); }
    </style>
</head>
<body>
    <div id="graph"></div>

    <div id="search-panel" class="panel">
        <h3>Explorar Universo GOS</h3>
        <input type="text" id="search" placeholder="Buscar ingrediente, receta...">
        <div id="stats" style="margin-top: 10px; font-size: 0.75rem; color: #666;"></div>
    </div>

    <div id="info-panel" class="panel">
        <div id="details"></div>
    </div>

    <script>
        const GRAPH_DATA = __GRAPH_DATA_PLACEHOLDER__;

        const COLORS = {
            recipe: '#ff4b4b', ingredient: '#4ECDC4', flavor: '#ffe66d',
            texture: '#f38181', region: '#7d61ff', technique: '#95e1d3'
        };

        const elem = document.getElementById('graph');
        const Graph = ForceGraph()(elem)
            .graphData(GRAPH_DATA)
            .backgroundColor('#0b0b0b')
            .nodeId('id')
            .nodeVal('val')
            .nodeColor(n => COLORS[n.type] || '#888')
            .linkColor(() => '#2a2a2a')
            .onNodeClick(node => {
                showDetails(node);
                Graph.centerAt(node.x, node.y, 1000);
                Graph.zoom(3, 1000);
            })
            .nodeCanvasObject((node, ctx, globalScale) => {
                const r = node.val;
                const fontSize = 12/globalScale;

                // Glow for important nodes
                if (node.val > 5) {
                    ctx.shadowBlur = node.val * 1.5;
                    ctx.shadowColor = COLORS[node.type];
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = COLORS[node.type] || '#888';
                ctx.fill();
                ctx.shadowBlur = 0; // Reset

                // Text Label
                if (globalScale > 2.5 || node.val > 8) {
                    ctx.font = `${fontSize}px Inter`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const textWidth = ctx.measureText(node.label).width;

                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(node.x - textWidth/2 - 2, node.y + r + 2, textWidth + 4, fontSize + 4);

                    ctx.fillStyle = '#eee';
                    ctx.fillText(node.label, node.x, node.y + r + fontSize/2 + 4);
                }
            });

        // Stats
        document.getElementById('stats').innerText = `${GRAPH_DATA.nodes.length} Nodos • ${GRAPH_DATA.links.length} Conexiones`;

        // Search
        document.getElementById('search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            if(val.length < 2) return;
            const node = GRAPH_DATA.nodes.find(n => n.label.toLowerCase().includes(val));
            if(node) {
                Graph.centerAt(node.x, node.y, 1000);
                Graph.zoom(4, 1000);
                showDetails(node);
            }
        });

        function showDetails(node) {
            const panel = document.getElementById('info-panel');
            panel.style.display = 'block';

            // Find connections
            const links = GRAPH_DATA.links.filter(l => l.source.id === node.id || l.target.id === node.id);

            let html = `<div style="color:${COLORS[node.type]}; font-size: 0.8rem; font-weight:bold; margin-bottom:5px;">${node.type.toUpperCase()}</div>`;
            html += `<div style="font-size: 1.4rem; font-weight:bold; margin-bottom:15px; color:#fff;">${node.label}</div>`;

            if(node.region) html += `<span class="tag">${node.region}</span>`;
            if(node.scientific_name) html += `<div style="margin-top:10px; font-style:italic; color:#888;">${node.scientific_name}</div>`;

            html += `<h3 style="margin-top:20px;">Conexiones (${links.length})</h3>`;
            html += `<div>`;
            links.forEach(link => {
                const other = link.source.id === node.id ? link.target : link.source;
                html += `<div class="cx-item" onclick="focusNode('${other.id}')">
                    <span><span style="color:${COLORS[other.type]}">●</span> ${other.label}</span>
                </div>`;
            });
            html += `</div>`;

            document.getElementById('details').innerHTML = html;
        }

        function focusNode(id) {
            const node = GRAPH_DATA.nodes.find(n => n.id === id);
            if(node) {
                Graph.centerAt(node.x, node.y, 1000);
                Graph.zoom(4, 1000);
                showDetails(node);
            }
        }

        window.addEventListener('resize', () => { Graph.width(window.innerWidth).height(window.innerHeight); });
    </script>
</body>
</html>"""

# --- PARSING LOGIC ---

def clean_id(text):
    return re.sub(r'[^a-zA-Z0-9]', '_', str(text).lower().strip())

def extract_frontmatter(content):
    if content.startswith("---"):
        try:
            _, fm, _ = content.split("---", 2)
            return yaml.safe_load(fm)
        except:
            pass
    return {}

def build_data():
    nodes = {}
    edges = []

    print("🔍 Scanning recipes...")
    for f in DISHES_DIR.rglob("*.md"):
        if f.name.startswith("_") or "README" in f.name: continue
        data = extract_frontmatter(f.read_text(encoding="utf-8"))
        if not data or 'title' not in data: continue

        rid = clean_id(data['title'])
        nodes[rid] = {
            "id": rid, "label": data['title'], "type": "recipe",
            "region": data.get('region', 'Unknown'),
            "val": 10 # Base size for recipes
        }

        # Region Link
        if data.get('region'):
            reg_id = clean_id(data['region'])
            nodes[reg_id] = {"id": reg_id, "label": data['region'], "type": "region", "val": 15}
            edges.append({"source": rid, "target": reg_id, "type": "FROM"})

        # Ingredients (The core network)
        for ing in data.get('main_ingredients', []):
            iid = clean_id(ing)
            if iid not in nodes:
                nodes[iid] = {"id": iid, "label": ing, "type": "ingredient", "val": 5}
            edges.append({"source": rid, "target": iid, "type": "USES"})

        # Sensory (Flavor/Texture)
        if 'sensory' in data:
            for flav in data['sensory'].get('flavor', []):
                fid = clean_id(flav)
                if fid not in nodes: nodes[fid] = {"id": fid, "label": flav, "type": "flavor", "val": 3}
                edges.append({"source": rid, "target": fid, "type": "HAS_FLAVOR"})

    print("🥕 Scanning ingredients (metadata)...")
    if INGREDIENTS_DIR.exists():
        for f in INGREDIENTS_DIR.rglob("*.md"):
            data = extract_frontmatter(f.read_text(encoding="utf-8"))
            if 'name' not in data: continue

            iid = clean_id(data['name'])
            # Update existing or create new
            if iid not in nodes:
                nodes[iid] = {"id": iid, "label": data['name'], "type": "ingredient", "val": 5}

            nodes[iid]['scientific_name'] = data.get('scientific_name')

            # Substitutes
            for sub in data.get('substitutes', []):
                sid = clean_id(sub)
                if sid not in nodes: nodes[sid] = {"id": sid, "label": sub, "type": "ingredient", "val": 5}
                edges.append({"source": iid, "target": sid, "type": "SUBSTITUTE"})

    # Post-process: Calculate node weights based on connections
    conn_count = defaultdict(int)
    for e in edges:
        conn_count[e['source']] += 1
        conn_count[e['target']] += 1

    for nid, node in nodes.items():
        # Dynamic size: Base + (Connections * 0.5)
        node['val'] = node.get('val', 5) + (conn_count[nid] * 0.5)

    return {"nodes": list(nodes.values()), "links": edges}

def main():
    graph_data = build_data()

    # 1. Save JSON
    OUTPUT_JSON.parent.mkdir(exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, indent=2, ensure_ascii=False)
    print(f"✅ Generated JSON: {OUTPUT_JSON}")

    # 2. Build Standalone HTML
    json_str = json.dumps(graph_data, ensure_ascii=False)
    html_content = HTML_TEMPLATE.replace('__GRAPH_DATA_PLACEHOLDER__', json_str)

    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"✅ Generated HTML: {OUTPUT_HTML} (Standalone)")

if __name__ == "__main__":
    main()
