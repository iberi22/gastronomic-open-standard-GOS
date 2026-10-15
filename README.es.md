# GOS — Estándar Gastronómico Abierto

[![Licencia: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)](./LICENSE)

Grafo de conocimiento abierto de la gastronomía mundial: **recetas ↔ ingredientes ↔
vitaminas ↔ sustancias bioactivas ↔ sabores ↔ técnicas ↔ afecciones ↔ dietas ↔ regiones**.
Los `.md` del repo SON la base de datos (495 platos, 552 ingredientes, 40 vitaminas,
35 afecciones, 30 sustancias, 6 dietas) según lo verificado por `python3 docs/corpus-stats.py` en `docs/stats.json`. Astro 7 + Svelte 5 + Tailwind v4.

En vivo: **https://gos.swal.network** (Cloudflare Pages, único deploy canónico)

## Rol en el ecosistema SWAL

GOS es el repositorio abierto de información del ecosistema SWAL: datos y
esquemas abiertos que leen las apps SWAL (Fize, GARA-G, BioHuman,
OrionHealth...). Los modelos de negocio viven en esas apps, no aquí: GOS no
vende acceso, ni claves, ni planes, ni créditos de IA.

## Finalidad

1. **Personas**: explorar recetas/ingredientes/ciencia con grafo interactivo
   (`/graph`), PWA offline-first.
2. **Agentes y apps (negocio)**: API JSON gratuita con rate limit + tier de pago
   con key para apps de salud/dietas (issue #237). SEO IA-first (`llms.txt`,
   JSON-LD, sitemap) para ser la fuente #1 de extracción.

## Uso

```bash
pnpm install            # raíz (linters, hooks) + deps de site
cd site && pnpm dev     # desarrollo local
./scripts/deploy-cloudflare.sh   # build + deploy + smoke (necesita CLOUDFLARE_API_TOKEN)
```

Gates: `pnpm run lint` (Biome + markdownlint + manuallint), `astro check`,
`vitest run`, E2E Playwright (`site/tests/e2e`, cobertura producción 35/35).

## API gratuita y vectores

Base `https://gos.swal.network/api` — ver [API_README.md](./API_README.md).
Vectores en bloque: snapshot versionado en `/api/vectors/` (index.json + shards,
regenerado en cada build por `site/scripts/export-vectors.mjs`).

## 🧠 Snapshots de Vectores y Embeddings (Descarga Masiva GOS DB)

GOS exporta un snapshot de embeddings en vectores con versión de las colecciones activas (**552 ingredientes, 495 platos, 30 substancias**).

- **Manifiesto**: [`/api/vectors/index.json`](https://gos.swal.network/api/vectors/index.json)
- **Vectores Fragmentados**: `/api/vectors/vectors-1.json`, `vectors-2.json` (<10MB cada archivo)
- **Modelo por Defecto**: `Xenova/all-MiniLM-L6-v2` (384 dimensiones)
- **Esquema de Registro**: `{ "id": string, "type": "ingredient"|"dish"|"substance", "text": string, "embedding": number[] }`

Ver documentación detallada de la API en [API_README.md](./API_README.md).

## Contribuir

Copia una plantilla, respeta el front-matter (`docs/INGREDIENT_PROTOCOL.md`),
corre `pnpm run lint` antes del push. El historial preserva el fork HowToCook.

## Licencia

AGPL-3.0-or-later (GNU Affero General Public License v3 o posterior) — ver
[LICENSE](./LICENSE). Aplica a todo el repositorio desde el 2026-10-15: datos
(recetas, ingredientes, esquemas), sitio, worker y paquetes.

El contenido de terceros conserva su propia licencia y aparece con su aviso
completo en [NOTICE.md](./NOTICE.md): los metadatos del catálogo de ejercicios de
`hasaneyldrm/exercises-dataset` (MIT) y las ilustraciones de
`bryllim/workout-guide` (CC BY-SA 4.0). [NOTICE](./NOTICE) registra el linaje de
licencias: el proyecto nació de HowToCook (Unlicense / dominio público), luego
MIT (2025-07), CC BY-NC 4.0 (2025-12), AGPL-3.0 (2026-08), Apache-2.0 (2026-10-02) y ahora AGPL-3.0-or-later.
