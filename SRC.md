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
├── src/                    # Código fuente
├── recipes_metadata.json   # Metadatos de recetas
├── recipes_vectors.jsonl   # Vectores de recetas
├── package.json
├── docker-compose.yml
├── README.es.md
├── README.md
├── AGENTS.md               # Contrato de agentes
├── PLAN_DE_ESTANDARIZACION.md
└── .gitcore/              # Git-Core protocol
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
