# GOS — Estándar Gastronómico Abierto

Grafo de conocimiento abierto de la gastronomía mundial: **recetas ↔ ingredientes ↔
vitaminas ↔ sustancias bioactivas ↔ sabores ↔ técnicas ↔ afecciones ↔ dietas ↔ regiones**.
Los `.md` del repo SON la base de datos (405 platos, 552 ingredientes, 40 vitaminas,
35 afecciones, 30 sustancias, 6 dietas). Astro 7 + Svelte 5 + Tailwind v4.

En vivo: **https://gos-site.pages.dev** (Cloudflare Pages, único deploy canónico)

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

Base `https://gos-site.pages.dev/api` — ver [API_README.md](./API_README.md).
Vectores en bloque: snapshot versionado en `/api/vectors/` (index.json + shards,
regenerado en cada build por `site/scripts/export-vectors.mjs`).

## 🧠 Snapshots de Vectores y Embeddings (Descarga Masiva GOS DB)

GOS exporta un snapshot de embeddings en vectores con versión de las colecciones activas (**552 ingredientes, 383 platos, 30 substancias**).

- **Manifiesto**: [`/api/vectors/index.json`](https://gos-site.pages.dev/api/vectors/index.json)
- **Vectores Fragmentados**: `/api/vectors/vectors-1.json`, `vectors-2.json` (<10MB cada archivo)
- **Modelo por Defecto**: `Xenova/all-MiniLM-L6-v2` (384 dimensiones)
- **Esquema de Registro**: `{ "id": string, "type": "ingredient"|"dish"|"substance", "text": string, "embedding": number[] }`

Ver documentación detallada de la API en [API_README.md](./API_README.md).

## Contribuir

Copia una plantilla, respeta el front-matter (`docs/INGREDIENT_PROTOCOL.md`),
corre `pnpm run lint` antes del push. El historial preserva el fork HowToCook.
