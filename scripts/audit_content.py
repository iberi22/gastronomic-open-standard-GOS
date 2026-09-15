#!/usr/bin/env python3
"""
GOS Content & Interconnection Audit Tool
---------------------------------------
Deterministic audit script for Gastronomic Open Standard (GOS).
Measures recipes, ingredients, knowledge graph metrics, and Wave C scorecard.

Usage:
  python3 scripts/audit_content.py [options]

Options:
  --json PATH                 Path to write JSON output report
  --md PATH                   Path to write Markdown output report
  --check                     Exit non-zero if threshold metrics are violated
  --quiet                     Suppress output to console
  --allow-missing-graph       Do not fail --check if site/public/graph-data.json is missing
  --max-missing-sensorial N   Max allowed recipes missing sensory section (default: 211)
  --max-recipes-without-ingredients N
                              Max allowed recipes missing main_ingredients (default: 20)
  --max-isolated N            Max allowed isolated graph nodes (default: 6)
  --max-orphans N             Max allowed orphan edges in graph (default: 0)
  --min-edge-types N          Minimum allowed unique edge types in graph (default: 15)
"""

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError:  # mensaje accionable en lugar de traceback crudo
    sys.stderr.write(
        "Se requiere PyYAML para auditar el frontmatter. Usa el venv del repo "
        "(`.venv/bin/python scripts/audit_content.py ...`) o instálalo: "
        "`pip install pyyaml`.\n"
    )
    raise SystemExit(2)

# Canonical Latin character set (ASCII + Spanish accents/diacritics & standard punctuation)
LATIN_CHARSET = set(
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789_ -áéíóúñÁÉÍÓÚÑüÜ,()./'\":;!¡?¿"
)


def parse_frontmatter(content: str) -> dict:
    """Parses YAML frontmatter from markdown file content."""
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                data = yaml.safe_load(parts[1])
                return data if isinstance(data, dict) else {}
            except Exception:
                pass
    return {}


def audit_recipes(dishes_dir: Path) -> dict:
    """Audits all recipe markdown files in dishes/ directory."""
    recipe_files = []
    if dishes_dir.exists():
        recipe_files = sorted([
            p for p in dishes_dir.rglob("*.md")
            if p.name != "README.md"
        ])

    missing_sensorial = 0
    missing_main_ingredients = 0
    less_than_3_ingredients = 0
    titles = []
    slugs = []
    per_region_counter = Counter()

    for p in recipe_files:
        content = p.read_text(encoding="utf-8", errors="ignore")
        if "Perfil Sensorial Estandarizado" not in content:
            missing_sensorial += 1

        fm = parse_frontmatter(content)
        title = str(fm.get("title", p.stem)).strip()
        slug = str(fm.get("slug", p.stem)).strip()
        region = str(fm.get("region", p.parent.name)).strip()

        titles.append(title)
        slugs.append(slug)
        per_region_counter[region] += 1

        ings = fm.get("main_ingredients")
        if not ings or not isinstance(ings, list) or len(ings) == 0:
            missing_main_ingredients += 1
        elif len(ings) < 3:
            less_than_3_ingredients += 1

    duplicate_titles = len(titles) - len(set(titles))
    duplicate_slugs = len(slugs) - len(set(slugs))

    # Sorted dict for determinism
    per_region_sorted = dict(sorted(per_region_counter.items()))

    return {
        "total": len(recipe_files),
        "missing_sensorial": missing_sensorial,
        "missing_main_ingredients": missing_main_ingredients,
        "less_than_3_ingredients": less_than_3_ingredients,
        "duplicate_titles": duplicate_titles,
        "duplicate_slugs": duplicate_slugs,
        "per_region": per_region_sorted,
    }


def audit_ingredients(ingredients_dir: Path) -> dict:
    """Audits all ingredient markdown files under ingredients/ directory."""
    curated_count = 0
    pending_count = 0
    archive_count = 0
    non_latin_name_count = 0
    data_values_unknown_count = 0
    aliases_count = 0
    substitutes_count = 0
    micronutrients_count = 0

    all_ing_files = []
    if ingredients_dir.exists():
        all_ing_files = sorted([
            p for p in ingredients_dir.rglob("*.md")
            if p.name not in ("README.md", "_template.md")
        ])

    for p in all_ing_files:
        rel = p.relative_to(ingredients_dir)
        first_part = rel.parts[0]
        if first_part == "pending_review":
            pending_count += 1
        elif first_part == "_archive":
            archive_count += 1
        else:
            curated_count += 1

        content = p.read_text(encoding="utf-8", errors="ignore")
        fm = parse_frontmatter(content)

        name = str(fm.get("name", p.stem)).strip()
        if any(c not in LATIN_CHARSET for c in name):
            non_latin_name_count += 1

        # Check for Unknown/Desconocido data values
        has_unknown = False
        for k, v in fm.items():
            if isinstance(v, str) and v.strip().lower() in ("unknown", "desconocido"):
                has_unknown = True
                break
        if has_unknown:
            data_values_unknown_count += 1

        if fm.get("aliases"):
            aliases_count += 1
        if fm.get("substitutes"):
            substitutes_count += 1
        if fm.get("micronutrients") or fm.get("nutrients") or fm.get("nutritional_info"):
            micronutrients_count += 1

    total = len(all_ing_files)
    def pct(cnt: int) -> float:
        return round((cnt / total * 100), 2) if total > 0 else 0.0

    return {
        "curated": curated_count,
        "pending_review": pending_count,
        "archive": archive_count,
        "total": total,
        "non_latin_name": non_latin_name_count,
        "data_values_unknown": data_values_unknown_count,
        "aliases_coverage": {
            "count": aliases_count,
            "percentage": pct(aliases_count),
        },
        "substitutes_coverage": {
            "count": substitutes_count,
            "percentage": pct(substitutes_count),
        },
        "micronutrients_coverage": {
            "count": micronutrients_count,
            "percentage": pct(micronutrients_count),
        },
    }


def audit_graph(graph_json_path: Path) -> dict:
    """Audits site/public/graph-data.json if present."""
    if not graph_json_path.exists():
        return {
            "available": False,
            "message": f"Graph artifact missing at {graph_json_path}",
        }

    try:
        content = graph_json_path.read_text(encoding="utf-8")
        data = json.loads(content)
    except Exception as e:
        return {
            "available": False,
            "message": f"Failed to parse {graph_json_path}: {e}",
        }

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    node_types = Counter()
    node_map = {}
    for n in nodes:
        nid = n.get("id")
        node_map[nid] = n
        ntype = n.get("type", "unknown")
        node_types[ntype] += 1

    edge_types = Counter()
    degree = defaultdict(int)
    for nid in node_map:
        degree[nid] = 0

    orphans = []
    for e in edges:
        etype = e.get("type", "unknown")
        edge_types[etype] += 1
        src = e.get("source")
        tgt = e.get("target")

        if src in node_map:
            degree[src] += 1
        else:
            orphans.append(e)

        if tgt in node_map:
            degree[tgt] += 1
        else:
            if src in node_map:
                orphans.append(e)

    isolated = sorted([nid for nid, d in degree.items() if d == 0])

    # Degree histogram
    degree_counts = Counter(degree.values())
    degree_histogram = {str(k): degree_counts[k] for k in sorted(degree_counts.keys())}

    # Top 10 hubs
    sorted_by_degree = sorted(
        degree.items(),
        key=lambda item: (-item[1], item[0])
    )
    top_10_hubs = []
    for nid, deg in sorted_by_degree[:10]:
        n = node_map[nid]
        top_10_hubs.append({
            "id": nid,
            "label": str(n.get("label", nid)),
            "type": str(n.get("type", "")),
            "degree": deg,
        })

    # Per diet connectivity
    diet_nodes = sorted(
        [n for n in nodes if n.get("type") == "diet"],
        key=lambda x: str(x.get("id"))
    )
    per_diet_connectivity = []
    for n in diet_nodes:
        nid = str(n.get("id"))
        per_diet_connectivity.append({
            "id": nid,
            "label": str(n.get("label", nid)),
            "degree": degree[nid],
        })

    edge_vocab = sorted(list(edge_types.keys()))

    return {
        "available": True,
        "nodes": len(nodes),
        "edges": len(edges),
        "per_type": {
            "nodes": dict(sorted(node_types.items())),
            "edges": dict(sorted(edge_types.items())),
        },
        "degree_histogram": degree_histogram,
        "isolated": isolated,
        "isolated_count": len(isolated),
        "orphans": orphans,
        "orphan_count": len(orphans),
        "edge_vocabulary": edge_vocab,
        "edge_vocabulary_count": len(edge_vocab),
        "top_10_hubs": top_10_hubs,
        "per_diet_connectivity": per_diet_connectivity,
    }


def build_scorecard(recipes: dict, ingredients: dict, graph: dict) -> list:
    """Builds the Wave C Scorecard list of issues and metrics."""
    scorecard = [
        {
            "issue": "C.01 (Recetas & Perfil Sensorial)",
            "metric": "Recetas sin perfil sensorial y sin ingredientes principales",
            "current_value": (
                f"{recipes['missing_sensorial']} sin sensorial / "
                f"{recipes['missing_main_ingredients']} sin ingredientes"
            ),
            "acceptance_metric": "0 sin sensorial / 0 sin ingredientes",
        },
        {
            "issue": "C.02 (Curación de Ingredientes)",
            "metric": "Ingredientes en pending_review y nombres no latinos",
            "current_value": (
                f"{ingredients['pending_review']} en pending_review / "
                f"{ingredients['non_latin_name']} no latinos"
            ),
            "acceptance_metric": "0 en pending_review / 0 no latinos",
        },
        {
            "issue": "C.03 (Grafo de Conocimiento)",
            "metric": "Nodos aislados, aristas huérfanas y vocabulario de aristas",
            "current_value": (
                f"{graph.get('isolated_count', 'N/A')} aislados / "
                f"{graph.get('orphan_count', 'N/A')} huérfanas / "
                f"{graph.get('edge_vocabulary_count', 'N/A')} tipos aristas"
            ),
            "acceptance_metric": "0 aislados / 0 huérfanas / >= 15 tipos aristas con FITS_DIET y SUBSTITUTE_FOR",
        },
        {
            "issue": "C.04 (CI Gate & Enforcing)",
            "metric": "Paso de validación CI `audit_content.py --check`",
            "current_value": "Tool implementado (CI wiring pendiente en C.04)",
            "acceptance_metric": "CI workflow ejecuta `audit_content.py --check` y bloquea regersiones",
        },
        {
            "issue": "C.05 (Herramienta & Baseline Audit)",
            "metric": "Herramienta determinista scripts/audit_content.py y docs/CONTENT_AUDIT.md",
            "current_value": "Implementado & committed baseline",
            "acceptance_metric": "Herramienta CLI determinista en repo root + baseline documentado",
        },
    ]
    return scorecard


def generate_markdown(audit_data: dict, generated_at: str = None) -> str:
    """Generates the Markdown audit report (CONTENT_AUDIT.md)."""
    lines = []
    lines.append("# GOS Content & Interconnection Audit Baseline Report")
    lines.append("")
    if generated_at:
        lines.append(f"> **Generado:** `{generated_at}`")
        lines.append("")

    lines.append("## 📊 Resumen Ejecutivo")
    lines.append("")

    rec = audit_data["recipes"]
    ing = audit_data["ingredients"]
    grp = audit_data["graph"]

    lines.append(f"- **Recetas Totales:** `{rec['total']}`")
    lines.append(f"  - Sin Perfil Sensorial: `{rec['missing_sensorial']}`")
    lines.append(f"  - Sin `main_ingredients`: `{rec['missing_main_ingredients']}`")
    lines.append(f"  - Con < 3 ingredientes: `{rec['less_than_3_ingredients']}`")
    lines.append(f"  - Slugs duplicados: `{rec['duplicate_slugs']}`")
    lines.append(f"- **Ingredientes Totales:** `{ing['total']}`")
    lines.append(f"  - Curados: `{ing['curated']}` | Pending Review: `{ing['pending_review']}` | Archive: `{ing['archive']}`")
    lines.append(f"  - Nombres no latinos: `{ing['non_latin_name']}`")
    lines.append(f"  - Cobertura Aliases: `{ing['aliases_coverage']['count']}` ({ing['aliases_coverage']['percentage']}%)")
    lines.append(f"  - Cobertura Micronutrientes: `{ing['micronutrients_coverage']['count']}` ({ing['micronutrients_coverage']['percentage']}%)")

    if grp.get("available"):
        lines.append(f"- **Grafo de Conocimiento:** `{grp['nodes']}` Nodos | `{grp['edges']}` Aristas")
        lines.append(f"  - Nodos aislados: `{grp['isolated_count']}`")
        lines.append(f"  - Aristas huérfanas: `{grp['orphan_count']}`")
        lines.append(f"  - Tipos de arista (vocabulario): `{grp['edge_vocabulary_count']}`")
    else:
        lines.append(f"- **Grafo de Conocimiento:** ⚠️ `{grp.get('message', 'No disponible')}`")

    lines.append("")
    lines.append("## 📋 Scorecard Wave C")
    lines.append("")
    lines.append("| Issue | Métrica / Objetivo | Valor Actual | Métrica de Aceptación |")
    lines.append("|---|---|---|---|")
    for row in audit_data["scorecard"]:
        lines.append(f"| {row['issue']} | {row['metric']} | {row['current_value']} | {row['acceptance_metric']} |")

    lines.append("")
    lines.append("## 🍲 Recetas (`dishes/`)")
    lines.append("")
    lines.append(f"- **Total de Recetas:** {rec['total']}")
    lines.append(f"- **Sin Perfil Sensorial Estandarizado:** {rec['missing_sensorial']}")
    lines.append(f"- **Sin `main_ingredients`:** {rec['missing_main_ingredients']}")
    lines.append(f"- **Recetas con < 3 ingredientes:** {rec['less_than_3_ingredients']}")
    lines.append(f"- **Títulos duplicados:** {rec['duplicate_titles']}")
    lines.append(f"- **Slugs duplicados:** {rec['duplicate_slugs']}")
    lines.append("")
    lines.append("### Desglose por Región")
    lines.append("")
    lines.append("| Región | Recetas |")
    lines.append("|---|---|")
    for reg, cnt in rec["per_region"].items():
        lines.append(f"| {reg} | {cnt} |")

    lines.append("")
    lines.append("## 🥕 Ingredientes (`ingredients/`)")
    lines.append("")
    lines.append(f"- **Curados (`ingredients/<categoria>/`):** {ing['curated']}")
    lines.append(f"- **Pendientes (`ingredients/pending_review/`):** {ing['pending_review']}")
    lines.append(f"- **Archivados (`ingredients/_archive/`):** {ing['archive']}")
    lines.append(f"- **Archivos con nombre no latino (CJK/Otros):** {ing['non_latin_name']}")
    lines.append(f"- **Archivos con valores data 'Unknown':** {ing['data_values_unknown']}")
    lines.append(f"- **Cobertura de Aliases:** {ing['aliases_coverage']['count']} ({ing['aliases_coverage']['percentage']}%)")
    lines.append(f"- **Cobertura de Sustitutos:** {ing['substitutes_coverage']['count']} ({ing['substitutes_coverage']['percentage']}%)")
    lines.append(f"- **Cobertura de Micronutrientes:** {ing['micronutrients_coverage']['count']} ({ing['micronutrients_coverage']['percentage']}%)")

    lines.append("")
    lines.append("## 🕸️ Grafo de Conocimiento (`site/public/graph-data.json`)")
    lines.append("")

    if not grp.get("available"):
        lines.append(f"⚠️ **El artefacto del grafo no está disponible:** {grp.get('message')}")
    else:
        lines.append(f"- **Nodos Totales:** {grp['nodes']}")
        lines.append(f"- **Aristas Totales:** {grp['edges']}")
        lines.append(f"- **Nodos Aislados (Grado 0):** {grp['isolated_count']} ({', '.join(grp['isolated']) if grp['isolated'] else 'Ninguno'})")
        lines.append(f"- **Aristas Huérfanas:** {grp['orphan_count']}")
        lines.append(f"- **Tipos de Aristas (Vocabulario - {grp['edge_vocabulary_count']}):** {', '.join(grp['edge_vocabulary'])}")

        lines.append("")
        lines.append("### Nodos por Tipo")
        lines.append("")
        lines.append("| Tipo de Nodo | Cantidad |")
        lines.append("|---|---|")
        for ntype, cnt in grp["per_type"]["nodes"].items():
            lines.append(f"| {ntype} | {cnt} |")

        lines.append("")
        lines.append("### Aristas por Tipo")
        lines.append("")
        lines.append("| Tipo de Arista | Cantidad |")
        lines.append("|---|---|")
        for etype, cnt in grp["per_type"]["edges"].items():
            lines.append(f"| {etype} | {cnt} |")

        lines.append("")
        lines.append("### Top 10 Hubs (Nodos con mayor grado)")
        lines.append("")
        lines.append("| ID Nodo | Etiqueta | Tipo | Grado |")
        lines.append("|---|---|---|---|")
        for hub in grp["top_10_hubs"]:
            lines.append(f"| `{hub['id']}` | {hub['label']} | {hub['type']} | {hub['degree']} |")

        lines.append("")
        lines.append("### Conectividad de Dietas")
        lines.append("")
        lines.append("| Dieta | Grado | Estado |")
        lines.append("|---|---|---|")
        for d in grp["per_diet_connectivity"]:
            status = "❌ Aislado" if d["degree"] == 0 else "✅ Conectado"
            lines.append(f"| `{d['label']}` (`{d['id']}`) | {d['degree']} | {status} |")

    lines.append("")
    lines.append("## Uso")
    lines.append("")
    lines.append("Este reporte es generado de forma determinista mediante el script `scripts/audit_content.py`.")
    lines.append("")
    lines.append("### Comandos principales")
    lines.append("```bash")
    lines.append("# Generar reporte Markdown y exportar métricas JSON")
    lines.append("python3 scripts/audit_content.py --json /tmp/audit.json --md docs/CONTENT_AUDIT.md")
    lines.append("")
    lines.append("# Ejecutar validación de umbrales para CI (exit 0 si cumple, non-zero si violado)")
    lines.append("python3 scripts/audit_content.py --check")
    lines.append("```")
    lines.append("")
    lines.append("### Umbrales soportados (`--check`)")
    lines.append("- `--max-missing-sensorial N` (defecto: 211): Máximo de recetas sin la sección `## 🔬 Perfil Sensorial Estandarizado`.")
    lines.append("- `--max-recipes-without-ingredients N` (defecto: 20): Máximo de recetas sin la lista `main_ingredients`.")
    lines.append("- `--max-isolated N` (defecto: 6): Máximo de nodos aislados (grado 0) permitidos en el grafo.")
    lines.append("- `--max-orphans N` (defecto: 0): Máximo de aristas huérfanas (referenciando nodos inexistentes).")
    lines.append("- `--min-edge-types N` (defecto: 15): Mínimo número de tipos de aristas en el vocabulario del grafo.")
    lines.append("- `--allow-missing-graph`: Permite ejecutar `--check` sin fallar si el artefacto `site/public/graph-data.json` no existe.")
    lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="GOS Content & Interconnection Audit Tool"
    )
    parser.add_argument("--json", type=str, help="Output path for JSON report")
    parser.add_argument("--md", type=str, help="Output path for Markdown report")
    parser.add_argument("--check", action="store_true", help="Validate metrics against thresholds and exit non-zero on failure")
    parser.add_argument("--quiet", action="store_true", help="Suppress console log output")
    parser.add_argument("--allow-missing-graph", action="store_true", help="Do not fail --check if graph-data.json is missing")

    # Threshold flags
    parser.add_argument("--max-missing-sensorial", type=int, default=211, help="Max missing sensory recipes allowed (default: 211)")
    parser.add_argument("--max-recipes-without-ingredients", type=int, default=20, help="Max missing ingredients recipes allowed (default: 20)")
    parser.add_argument("--max-isolated", type=int, default=6, help="Max isolated graph nodes allowed (default: 6)")
    parser.add_argument("--max-orphans", type=int, default=0, help="Max orphan edges allowed (default: 0)")
    parser.add_argument("--min-edge-types", type=int, default=15, help="Min edge types allowed in graph (default: 15)")

    args = parser.parse_args()

    root_dir = Path(".")
    dishes_dir = root_dir / "dishes"
    ingredients_dir = root_dir / "ingredients"
    graph_json_path = root_dir / "site" / "public" / "graph-data.json"

    if not args.quiet:
        print("🔍 Auditing GOS content and interconnections...")

    recipes_data = audit_recipes(dishes_dir)
    ingredients_data = audit_ingredients(ingredients_dir)
    graph_data = audit_graph(graph_json_path)
    scorecard_data = build_scorecard(recipes_data, ingredients_data, graph_data)

    full_audit = {
        "recipes": recipes_data,
        "ingredients": ingredients_data,
        "graph": graph_data,
        "scorecard": scorecard_data,
    }

    if not args.quiet:
        print(f"  • Recipes: {recipes_data['total']} total | {recipes_data['missing_sensorial']} missing sensory | {recipes_data['missing_main_ingredients']} missing ingredients")
        print(f"  • Ingredients: {ingredients_data['total']} total ({ingredients_data['curated']} curated, {ingredients_data['pending_review']} pending, {ingredients_data['archive']} archive) | {ingredients_data['non_latin_name']} non-Latin")
        if graph_data.get("available"):
            print(f"  • Graph: {graph_data['nodes']} nodes | {graph_data['edges']} edges | {graph_data['isolated_count']} isolated | {graph_data['orphan_count']} orphans | {graph_data['edge_vocabulary_count']} edge types")
        else:
            print(f"  • Graph: ⚠️ {graph_data.get('message')}")

    # Write JSON output if requested
    if args.json:
        json_path = Path(args.json)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(full_audit, f, indent=2, ensure_ascii=False)
        if not args.quiet:
            print(f"✅ JSON report written to {json_path}")

    # Write Markdown output if requested
    if args.md:
        md_path = Path(args.md)
        md_path.parent.mkdir(parents=True, exist_ok=True)
        # Note: generated_at included only in markdown header if needed, keeping body deterministic
        from datetime import datetime, timezone
        generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        md_content = generate_markdown(full_audit, generated_at=generated_at)
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)
        if not args.quiet:
            print(f"✅ Markdown report written to {md_path}")

    # Check thresholds if requested
    if args.check:
        violations = []

        if recipes_data["missing_sensorial"] > args.max_missing_sensorial:
            violations.append(
                f"Recipes missing sensorial section ({recipes_data['missing_sensorial']}) "
                f"exceeds max threshold ({args.max_missing_sensorial})"
            )

        if recipes_data["missing_main_ingredients"] > args.max_recipes_without_ingredients:
            violations.append(
                f"Recipes missing main_ingredients ({recipes_data['missing_main_ingredients']}) "
                f"exceeds max threshold ({args.max_recipes_without_ingredients})"
            )

        if not graph_data.get("available"):
            if not args.allow_missing_graph:
                violations.append(f"Graph artifact is missing or unavailable: {graph_data.get('message')}")
        else:
            if graph_data["isolated_count"] > args.max_isolated:
                violations.append(
                    f"Isolated graph nodes count ({graph_data['isolated_count']}) "
                    f"exceeds max threshold ({args.max_isolated})"
                )

            if graph_data["orphan_count"] > args.max_orphans:
                violations.append(
                    f"Orphan graph edges count ({graph_data['orphan_count']}) "
                    f"exceeds max threshold ({args.max_orphans})"
                )

            if graph_data["edge_vocabulary_count"] < args.min_edge_types:
                violations.append(
                    f"Graph edge types count ({graph_data['edge_vocabulary_count']}) "
                    f"is below min threshold ({args.min_edge_types})"
                )

        if violations:
            print("❌ Audit Check FAILED with the following violations:", file=sys.stderr)
            for v in violations:
                print(f"  - {v}", file=sys.stderr)
            sys.exit(1)
        else:
            if not args.quiet:
                print("🎉 Audit Check PASSED: All metrics satisfy threshold requirements.")

    sys.exit(0)


if __name__ == "__main__":
    main()
