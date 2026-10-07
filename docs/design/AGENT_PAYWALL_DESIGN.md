# GOS — Peaje para agentes IA

Auditoría + diseño. **No es código de producción.** Fecha 2026-10-01 · dominio canónico `https://gos.swal.network` · base `main@2fcec13c`.

## 0. Hallazgos que condicionan todo

1. **`site/astro.config.mjs:11` tiene `output: 'static'`** y ningún `APIRoute` exporta `prerender = false`. Todo endpoint se evalúa en build y se escribe como archivo plano en `dist/`. Por eso `POST /api/agent/pay` en prod responde **405, `content-length: 0`** — Astro nunca corre la función. `GET` al mismo archivo devuelve el mensaje de error del handler `GET`. Mismo fallo en `/api/entities/{x}`: devuelve HTML de 44 KB.
2. **La columna vertebral del peaje ya existe y es correcta**: `worker/src/index.ts` (gateway `gos-api-gateway`) ya valida `x-api-key` contra D1 `gos-billing`, ya tiene rate limit KV de 100 req/día free, ya devuelve **402** en `/api/ai/infer` sin key, ya delega claves `swal_*` a billing central. **CORREGIDO 2026-10-01 tras verificar en producción**: el gateway **SÍ está desplegado y vivo**. La URL real es `https://gos-api-gateway.iberi22.workers.dev` (200); el host `gos-api-gateway.workers.dev` no resuelve porque el subdominio no está habilitado en la cuenta, no porque falte el despliegue. `wrangler deployments list` muestra 2 despliegues: 2026-09-07 y 2026-10-01T19:02:51Z. `wrangler whoami` autentica como `iberi22@gmail.com` vía `CLOUDFLARE_API_TOKEN`.

Lo que hace hoy, medido con curl:
- proxy transparente al origen, con `ORIGIN_URL = "https://gos-site.pages.dev"` (host viejo, pendiente de corregir)
- `/api/agent/knowledge.json` → **200 `application/json`** y devuelve un bloque `paywall` que el sitio directo **no** tiene: `{"endpoint":"/api/agent/pay","tier":"socio","handling":"20% sobre infra 100% + AI*1.1 (Cloudflare Workers AI)","billing_lib":"site/src/lib/billing.ts"}`
- rutas sin proxyear (`/`, `/health`, `/v1/status`) devuelven el HTML del sitio, no 404: el fallback del origen las absorbe

Corrección pendiente: `ORIGIN_URL` debe apuntar a `https://gos.swal.network`; hoy el gateway sirve el despliegue de Pages, que ya no es el dominio canónico.
3. **El producto vendible ya existe en el repo y hoy no está publicado**: ver §1.

Estado verificado por curl hoy: funcionan `/api/index.json`, `/api/all.json` (1.299.954 B), `/api/with-metadata.json` (**byte-idéntico a `all.json`, es un alias**), `/api/by-country/catalog.json` (90.942 B), `/api/agent/knowledge.json` (589 B), `/api/evidence.json` (23.705 B), `/api/substances.json`, `/api/vectors/*.json` (**11.9 MB, 1.055 embeddings de 384 dim, público**), `/llms-full.txt` (43.375 B).

---

## 1. Qué datos finos se pueden cobrar

Conteos reales sobre `site/src/content/`: 552 ingredientes, 495 dishes, 45 mixtures, 40 vitamins, 35 conditions, 30 substances, 18 tips (0 con frontmatter).

| # | Dataset | Ruta que lo sostiene (verificada) | Estado |
|---|---|---|---|
| 1 | **Vitaminas/minerales per-100g** | `ingredients/*/nutrition_per_100g` (552/552) + `micronutrients` (552/552, 23 subcampos: `potassium_mg` 529, `vitamin_c_mg` 525, `magnesium_mg` 519, `selenium_ug` 7, `iron_mg` 6, `vitamin_d_iu` 3…) | **Cobrable ya.** No está en `/api/all.json`, ni en `variants.json`, ni en las 553 páginas HTML, ni en `graph-data.json` (nodos `ingredient` solo llevan `id/label/type/color/size/x/y`) |
| 2 | **Safety / allergy / sensory completos** | `safety_profile` (`safety_score`,`consumption_limit`,`concerns`) 515/552 · `allergy_profile` (`risk_level`,`allergens`,`cross_reactivity`,`prevalence_percent`) 515 · `sensory_profile` (6 claves) 515 | **Cobrable ya.** `ingredients/[...slug].astro:19-79` solo renderiza 7 campos — allergy/sensory/safety no salen en la web |
| 3 | **RDA / UL / deficiencia de vitaminas** | `vitamins/`: `rda` 38/40, `ul` 32, `deficiency` 39, `excess` 32, `functions` 25, `studies[]` 13 | **Cobrable ya**, sin contraparte pública |
| 4 | **Sinergias con evidencia** | `mixtures/` 45/45: `synergy_type`, `synergy_mechanism`, `contraindications`, `evidence_level`, `studies[]` | **Cobrable ya**, 45 registros, cero exposición |
| 5 | **Escalabilidad de recetas** | `dishes/`: `servings` 467/495, `prep_time`/`cook_time` 467, `main_ingredients` 467 + prosa (lotes) | **Cobrable.** Derivable de `servings`, no hace falta fuente nueva |
| 6 | **Embeddings como servicio** | `dist/api/vectors/vectors-{1,2,3}.json`, índice en `/api/vectors/index.json` (`count: {total:1055, ingredients:552, dishes:473, substances:30}`, modelo `Xenova/all-MiniLM-L6-v2`, dim 384) | **Cobrable ya** y es lo más caro de servir |
| 7 | `health_registry` + `active_compounds` | `ingredients/` (29 con `health_registry`, 552 con `active_compounds`) · `substances/` 30/30 con `health_registry` y `studies[]` | Cobrable; `substances` ya es público, el cruce fino no |
| 8 | `portions.default_g` + `i18n` es/zh | 552/552 y 515/552 | Cobrable trivial; `i18n` no está expuesto |

**No cobrable tal cual:**

- **`substitutes` está corrupto: 515/515 son literalmente `[{name:"Unknown", similarity_score:0.0, notes:"Unknown"}]`.** No se puede vender.
- **Glycemic index: no existe ninguna clave.** 3 archivos mencionan glycemic en prosa.
- **Antinutrientes: no hay campo.** Solo 2 dishes (`tamales_oaxaquenos`, `panta_bhat`), `fitato` en 5 archivos, `oxalato` en 3.
- **Pairing / temple / seasonality: solo en prosa**, no estructurado. Cuerdas contadas sobre 495 dishes: maridaje 162, timing/servir 208, temporada 6 (solo 6 recetas), costo 92. Extraíble, pero no existe todavía como campo.
- **Calidad de fondo:** `nutrition_per_100g.calories == 0` en **516 de 552** ingredientes (solo 36 reales). De los 515 con perfil enriquecido, **los 515 están en `ingredients/pending_review/` y los 515 tienen `sources` vacío** (solo 37 de 552 tienen fuentes). Cobrar antes del backfill es cobrar relleno.
- Los macros de receta **ya son públicos**: `/api/all.json` publica `nutrition.calories` + `macros{protein_g,fat_g,carbs_g}` (426 dishes, 420 con `calories>0`; `fiber_g`/`sugar_g` nunca en macros: 0/426). Los finos no.

---

## 2. Contrato `/api/premium/*`

**Dónde va: en `worker/src/index.ts`, no en el site.** El site es `static` y sin adapter; ahí un `APIRoute` se convierte en archivo plano. Premium es **solo API, nunca HTML**.

**Auth**: la que el gateway ya soporta — `Authorization: Bearer <key>` (preferido) o `x-api-key`. El tier sale **solo** de la fila de D1 de la key, nunca del body. Cabeceras en 200 y 402 idénticas: `X-GOS-Tier`, `X-GOS-Credit-Limit`, `X-GOS-Credit-Remaining`, `X-GOS-Paywall`.

| Ruta | Devuelve | 200 | 402 |
|---|---|---|---|
| `/api/premium/index.json` | catálogo de rutas + precios + crédito del key | key válida o free | key de pago sin crédito |
| `/api/premium/ingredients.json` | 552 ingredientes, campos base | — | — |
| `/api/premium/ingredients/{slug}.json` | detalle fino: `nutrition_per_100g`, `micronutrients`, `safety_profile`, `allergy_profile`, `sensory_profile`, `health_registry` | **200 con payload completo** (key `socio`) | **200 con teaser** si no hay key; 402 si la key es de pago sin crédito |
| `/api/premium/nutrients.json` · `/api/premium/nutrients/{n}.json` | índice de cobertura / serie por nutriente | igual | igual |
| `/api/premium/vitamins.json` | 40 vitaminas con `rda`/`ul`/`deficiency`/`excess`/`studies[]` | igual | igual |
| `/api/premium/mixtures.json` | 45 sinergias con `contraindications` + `studies[]` | igual | igual |
| `/api/premium/dishes/{slug}.json` | escalabilidad (`servings`, `timing`, `pairings`) | igual | igual |
| `/api/premium/vectors/query` | `POST {text,k}` → top-k de 384 dim sobre 1.055 vectores | key `socio` obligatoria | sin key = 200 con índice, sin consulta |
| `/api/ai/infer` | ya implementado en el gateway | — | ya devuelve 402 sin key de pago |

Params comunes: `?limit=` (max 200), `?cursor=`, `?fields=`, `?lang=es|en|zh`.

**Regla central — 200 degradado, no 402 sin contexto:**

> El gratis nunca recibe 402. Recibe **200 con teaser** (`_premium_fields.sugeridos[]` + `_meta.upgrade` con `tier_socio_usd:9`, `tier_socio_managed_usd:29`, `monthly_credit_tokens:50000`, `auth`, `key_request`). El de pago sin crédito recibe 402 con `ledger` y `upgrade`.

Un agente al que se le responde 403/402 sin contexto se rinde; al que ve `protein_g: 6.4` + `available_upgrade:true` se suscribe. Además así `robots.txt` puede ser 100 % permisivo: **no hay nada que bloquear**.

Precios desde `site/src/lib/billing.ts`: `free` 0 / `socio` 50.000 tokens + 10 GB + USD 9 / `socio-managed` 50.000 tokens + 50 GB + USD 29; `SWAL_HANDLING_PCT=0.2`, `AI_MARGIN_MIN_PCT=0.1`.

---

## 3. `robots.txt` — dirigir, no bloquear

Estado actual: `Allow: /` para `*` y para 9 agentes de IA (GPTBot, ClaudeBot, Claude-User, anthropic-ai, PerplexityBot, Google-Extended, CCBot, Bytespider, meta-externalagent), `Sitemap: https://gos.swal.network/sitemap.xml`. **Cero `Disallow` hoy, y debe seguir en cero.**

Añadir solo dos cosas: **ritmo** (`Crawl-delay`, que recorta scraping a ~1 req/s sin cerrar nada) y **descubrimiento** (el bloque de premium). Los datos finos no se ocultan al crawler: se exponen autenticados, y que el crawler lo **sepa** es el objetivo.

```txt
# GOS — Gastronomic Open Standard
# Politica: permiso abierto. Ningun Disallow.
# GOS es un estandar abierto pensado para ser consumido por maquinas.
# Los datos finos (micronutrientes, safety/allergy, sinergias, escalado, embeddings)
# se exponen bajo autenticacion en /api/premium/* — descubrirlos es el objetivo,
# cobrarlos es el modelo. Nada se oculta; nada se bloquea.
User-agent: *
Allow: /
Crawl-delay: 1

User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: Bytespider
Allow: /
User-agent: meta-externalagent
Allow: /

# Descubrimiento de pago (ninguna de estas rutas es HTML):
#   /llms.txt                          especificacion completa
#   /api/agent/knowledge.json          mapa de endpoints (ya responde JSON)
#   /api/premium/index.json            catalogo autoritativo + precios
#   POST /api/agent/pay                solicitud de key
# Tiers: socio USD 9/mes (50.000 tokens, 10 GB R2) | socio-managed USD 29/mes (50.000, 50 GB)
# Precio = infra 100% + AI x1.1 + 20% handling SWAL — fuente: site/src/lib/billing.ts
Sitemap: https://gos.swal.network/sitemap.xml
```

El bucle son 4 saltos JSON, sin HTML: `robots.txt` → `/llms.txt` → `/api/agent/knowledge.json` → `/api/premium/index.json` → teaser → `POST /api/agent/pay`.

Los tres canales de descubrimiento a tocar: `robots.txt` (arriba), `/llms.txt` (sección `## Premium Data` + honestidad: hoy anuncia "paid keys in D1" describiendo el gateway **no desplegado**), y `/api/agent/knowledge.json` (589 B, ya desplegado y funcional — su bloque `paywall` es el gancho de mayor conversión).

**Regla que ya se incumplió una vez:** anunciar rutasinexistentes es exactamente lo que pasó con `/api/knowledge.json` (devuelve HTML) y `/api/entities/{x}`. *Una ruta entra a robots.txt/llms.txt solo tras un curl que devuelva `200` + `application/json`.*

---

## 4. Riesgos de seguridad y abuso

**R1 — Key por query string (CRÍTICO, ya presente).** `worker/src/index.ts` acepta la key por tres vías: `x-api-key`, `Authorization: Bearer` y **`?key=<KEY>`**. Con `?key=` la credencial va al log de Cloudflare, al `Referer`, al historial y al error 405 que ya vemos en prod. Peor: `worker/schema.sql:10` insertaba una key de pago de nivel `socio` como literal SQL versionado — **credencial real en el repositorio público**. Verificado 2026-10-01: presente en el historial desde el commit `e0ecaa91`, no solo en el archivo actual; eliminarla del archivo no la borra del historial de git. *Mitigación:* rotar esa key, mover el seed a `wrangler secret put`, eliminar `?key=` del camino premium (legacy con sunset), una key por cliente. Eliminado del archivo y de este informe el 2026-10-01.

**R2 — JWT sin firma (CRÍTICO, ya presente).** `api/agent/pay.ts:67` firma `mock-signature-kv-d1`; cualquiera fabrica `{"tier":"socio","exp":<futuro>}`. Sin verificación, sin `jti`, sin revocación. *Mitigación:* HMAC-SHA256 real con secreto en KV (`wrangler secret put`), claims `tier/exp(<=15min)/iat/jti/aud/sub`; o mejor, **API key opaca + D1**, que es lo que el gateway ya sabe hacer.

**R3 — Crédito declarado por el cliente (CRÍTICO, ya presente).** `pay.ts:33`: `const used = Number(body.used ?? 0)`. Mandar `used:0` cada vez nunca agota crédito. *Mitigación:* ledger server-side en D1, incrementado tras inferencia real, con idempotency key. El `used` del body es informativo, nunca autoritativo.

**R4 — Bypass del tier `socio-managed` (MEDIO-ALTO, ya presente).** `pay.ts:36-38` salta la comprobación de 402, y el tier viene del body: `{tier:"socio-managed"}` se libra del pago. *Mitigación:* el tier sale solo de D1; sin key, tier `free` por definición. El bypass desaparece.

**R5 — Scraping masivo de lo gratis (MEDIO-ALTO).** `/api/vectors/vectors-*.json` (11.9 MB) y `/api/all.json` (1.3 MB) son públicos y sin límite: **5 peticiones bastan para reconstruir el índice semantico completo** — el activo más caro y el más expuesto. *Mitigación:* aplicar el rate limit KV existente a `vectors/` y bajarlo a 10/día free; servir el premium **derivado y filtrado** (`?fields=`) en shards verticales, nunca el volcado; documentar en `llms.txt` que el volcado free es una cortesía.

*(Riesgos verificados y descartados: `llms-full.txt` es lo único en `dist/` con `micronutrients` — 1 coincidencia — y ningún JSON de `dist/` contiene `similarity_score`. Exposición baja, pero conviene revisarlo en cada release.)*

---

## 5. BLOQUEANTE vs. implementable ya

### BLOQUEANTE — decisión del dueño

1. **Precio del dataset premium.** `billing.ts` ya tiene USD 9 / 29 para tiers de infra; falta el precio del *dataset* (¿mensual? ¿por key? ¿por 1k registros?).
2. **Stripe u otro.** No hay `stripe` en ningún `package.json` del repo. Stripe / Lemon Squeezy / Paddle / factura manual.
3. **Qué datos se cobran.** Mi recomendación: micronutrientes + safety/allergy + RDA/UL + mixtures + escalabilidad + embeddings. **Excluir** `substitutes` (corrupto) y glycemic/antinutrientes (no existen).
4. **Cliente: persona o agente.** Cambia auth y legal. Si es gente → login + suscripción; si son agentes → API key self-service, como ahora.
5. **¿Se cobra el grafo y los vectores?** `/graph-data.json` (4.499 nodos, 13.075 aristas, 16 tipos de relación) es la namesake del producto. Cobrarlo exige retirarlo de lo gratis: decisión de marca.
6. **`substitutes`: ¿embargo o backfill?** 515/515 `Unknown`. Defiendo rellenarlos antes de cobrar.

### PUEDO IMPLEMENTAR SIN PREGUNTAR

1. Desplegar `worker/` y apuntar `ORIGIN_URL` (hoy `gos-site.pages.dev`) a `https://gos.swal.network`. Sin esto no hay peaje.
2. Rotar la key de pago `socio` que estaba sembrada en `schema.sql` y sacarla del control de versiones (hecho 2026-10-01 en el archivo; **la rotación y la limpieza del historial siguen pendientes**).
3. Quitar `?key=` del camino premium; añadir el bloque de descubrimiento + `Crawl-delay` a `robots.txt`.
4. Los 8 endpoints de §2 con el contrato completo, **con precios en cero** hasta que haya decisión.
5. Test de regresión: el build falla si un campo premium aparece en un payload `free`.
6. Resolver `output: 'static'`: o `output:'server'` + `@astrojs/cloudflare`, o **borrar del site los `APIRoute` que ya viven en el gateway** (mi preferencia: una sola fuente de verdad).
7. Enriquecer `/api/agent/knowledge.json` con `premium_routes[]` y precios.
8. Extractor LLM para `pairings` (162 dishes) y `timing` (208 dishes) desde la prosa.
9. Añadir a `site/src/content.config.ts` las claves nuevas (`glycemic_index`, `antinutrients`, `pairings`, `timing`, `seasonality`, `scalability`, `substitutions`) — opcionales, no rompen nada. Recordar: **`.passthrough()` solo aplica al objeto padre**; un campo ausente del `z.object` hijo lo descarta Zod en silencio (`content.config.ts:133-136`).

Secuencia: **S0** (lo no bloqueante, precios a 0) → **S1** (Stripe + precios + portal de key) → **S2** (micronutrientes, safety/allergy, RDA/UL, mixtures) → **S3** (pairing, timing, escalabilidad) → **S4** (backfill de substitutes, glycemic, antinutrientes).

---

## No verificado

No ejecuté build ni tests: los números salen de parseo de `site/src/content/**` y `site/dist/**` tal como están en disco, más curl contra producción. `dist/` puede estar desfasado de `src/` — las conclusiones no dependen de `dist/`, vienen de `content.config.ts`, `astro.config.mjs` y de los curl. No comprobé si la key hardcodeada sigue en el historial de git. No leí `docs/nutritional_database.md` ni `INGREDIENT_PROTOCOL.md`, que pueden fijar alcance de calidad ya decidido. No audité los 18 `tips/` (0 con frontmatter). La corrupción de `substitutes` la conté en 515/515, o sea total.