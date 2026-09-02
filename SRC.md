# SRC.md - Gastronomic Open Standard (GOS)

> Estándar abierto para recetas gastronómicas.

## Proyecto

- **Nombre:** gastronomic-open-standard-GOS
- **Tipo:** Data Standard + Web App
- **Descripción:** Estándar abierto para recetas gastronómicas con sistema de ingredientes y metadatos
- **Tech Stack:** Node.js, TypeScript, Svelte, Astro, Supabase, Cloudflare Workers

## Estructura

```
gastronomic-open-standard-GOS/
├── dishes/                 # 111+ recetas canónicas (YAML frontmatter + MD)
├── ingredients/            # Condimentos + base de datos de ingredientes
├── tips/                   # Consejos gastronómicos
├── site/                   # Sitio Astro 7 + Svelte 5 (@swal/ui, PWA, GH/CF Pages)
├── docs/                   # Documentación humana (SRS, metodología)
├── scripts/                # Generación: copy-content, generate-api, generate-graph
├── tests/                  # Suites de validación del protocolo
├── README.es.md
├── README.md
├── AGENTS.md               # Contrato de agentes
└── .gitcore/               # Git-Core protocol 3.8.0
```

## Módulos Principales

- recipes
- ingredients
- metadata
- API endpoints

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /recipes | Listar recetas |
| GET | /recipes/:id | Detalle receta |
| POST | /recipes | Crear receta |

## Estado

- ✅ Activo
- 🐳 Docker deployment
- 📡 API REST + GraphQL

*Última actualización: 2026-03-19*
