⚠ claude-opus-4-1 is automatically remapped to Opus 5.5 (the latest Opus). Set CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1 to keep the requested model.
# Validación adversarial CC: resumen (HEAD `815459b7`, 2026-10-01 ~20:45)

**El informe no se escribió.** El entorno denegó tanto `Write` como la redirección por shell a `docs/audit/CC-VALIDATION-2026-10-02.md`, y no intenté rodearlo. El texto completo está redactado: si das permiso de escritura a esa ruta, lo guardo tal cual.

**Tampoco pude ejecutar nada.** Me denegaron `node`, `npx`, `python3`, `curl`, WebFetch y `git log -S/-G`. Un subagente que lancé para correr las suites recibió las mismas denegaciones (0 de 7 comandos). Por eso no repetí ni un test, build, sonda HTTP, consulta a Crossref ni control negativo. Toda cifra dinámica de los informes previos ("N passed", códigos HTTP, títulos de Crossref, `pnpm audit`, mutaciones) queda **NO VERIFICADA**, ni buena ni mala. Lo que sí afirmo sale de leer código con `archivo:línea`, de `grep`/`find`/`wc` y de `git show`/`diff`/`ls-files`. Donde uso conocimiento bibliográfico propio lo marco como no verificado por red.

**El repo cambió mientras auditaba.** Otro proceso commiteó `5ce0da3f` (20:23), `041ddcd3` (20:35) y `815459b7` (20:39), y regeneró `site/public/api` y `dist/`. El HEAD real al empezar era `8ccef08d`, no el `035e89b7` del briefing.

## Veredicto
1. **Se sostiene el núcleo estático:**
   - los 3 POST del sitio confían en el body;
   - `offline-seed` está muerto y consulta el store `'recipe'`, que no existe;
   - `onblocked` no se maneja;
   - `limoneno` publica un DOI inventado (`10.1000/…` es el prefijo de ejemplo de la DOI Foundation);
   - `sulforafano` sigue en `High` sobre una revisión narrativa;
   - 43 valores de `evidence_level` están fuera de High/Medium/Low.
2. **No se sostiene:**
   - PATRONES da por "✅ sano" el `/api/ai/infer` del gateway, que está en producción.
   - GATES-CI diagnostica mal el esquema y dice que `public/sitemap.xml` no está versionado (sí lo está).
   - ANOMALIAS cuenta como "otro artículo" al menos 2 DOI correctos.
   - PWA-OFFLINE dice "corregido" en `isSeeded()` y no lo está.
3. **El último commit repite el fallo de la ola anterior** (N-01).
4. **La redacción de las 3 claves reales no está publicada** (N-02).
5. **26 hallazgos nuevos:** 1 crítico, 4 altos, 11 medios, 10 bajos/info.

## Hallazgos nuevos principales
- **N-01, CRÍTICO.** El gate de DOI commiteado en `815459b7` está roto, y su mensaje afirma una medición imposible.
  - El diff borró todos los `^` de `site/scripts/verify-dois.py`: 7 líneas, entre ellas `norm()`, que pasó de `[^a-z0-9 ]` a `[a-z0-9 ]` (línea 77).
  - Ahora `norm()` elimina todas las letras, así que `coincide()` devuelve `MISMATCH` para casi cualquier título.
  - El commit dice "23 OK, 20 MISMATCH, control negativo 4/4, acepta quercetina". Con ese código, quercetina sale `MISMATCH`.
  - El job `verify-dois` de CI quedaría en rojo permanente sin distinguir un DOI bueno de uno falso, y bloquearía el auto-merge.
- **N-02, ALTA.** Hay 9 commits locales sin publicar (`origin/main` = `a0c03a8e`, último push 19:25:28).
  - `git show origin/main:docs/security/KEY-AUTH-VULNERABILITY-2026-10-01.md` tiene 0 `[REDACTED]` y 3 líneas `x-api-key`.
  - Las 3 claves siguen en claro en el `main` público, además del historial (`364cbfae`). Valores: [REDACTED].
  - Tampoco están publicados el gate del worker, el DOI de mentol, el fix de prototipos ni el de ISO-8601.
  - No pude hacer `fetch`: el estado real de GitHub queda NO VERIFICADO.
- **N-03, ALTA.** En el gateway activo, el ledger de crédito lo elige el cliente: `credits:${appId}` con `appId` del body (`worker/src/index.ts:281-287`).
  - Rotando `appId`, una key de pago tiene crédito de Workers AI ilimitado.
  - Sin `appId`, todas las keys comparten `credits:gos`, así que un cliente puede agotar el crédito de los demás.
  - Las keys de pago no pasan por rate limit (`:208`).
  - Hoy necesita una key válida; según el commit `6eff94c0`, `api_keys` tiene 0 filas (NO VERIFICADO).
- **N-04, ALTA.** El rate limit es nominal.
  - Cualquier `x-api-key` inválida devuelve 401 **antes** del contador (`:158-164`): peticiones ilimitadas, cada una con su consulta a D1.
  - El `get`+`put` en KV no es atómico, es eventualmente consistente y KV limita a ~1 escritura/s por clave, así que las ráfagas superan las 100/día.
  - Si la cuenta está en el plan gratuito de KV (1.000 escrituras/día), agotarlo apaga el límite para todos.
- **N-05, ALTA (proceso).** `robustez.audit.test.ts` (commit `8ccef08d`, que corre en CI) afirma la **presencia** de los bugs: `not.toContain('onblocked')` (:189), `isSeeded()===false` con la base llena (:168), `used` negativo aceptado (:47-50).
  - Aplicar las recomendaciones del propio informe ROBUSTEZ rompe CI.
  - "Si falla, el hallazgo es más fuerte" está al revés: si falla, lo más probable es que el bug se haya arreglado.
- **N-06, media-alta (sospechoso).** `auto-merge-unified.yml`:
  - mergea sin comprobar autor ni review;
  - elige la PR por nombre de rama `.[0]` (`:39`);
  - una PR sin checks cuenta como verde (`:72-86`);
  - interpola `head_branch` dentro de `run:`, con riesgo de inyección (también en `guardian-agent.yml:68`);
  - el filtro de Dependabot usa `github.actor`.
  - No verifiqué qué GitHub Apps disparan `check_suite`.
- **N-07, media.** Cada deploy descarga de HuggingFace el modelo `Xenova/all-MiniLM-L6-v2`, sin fijar revisión (`export-vectors.mjs:311-320`, `deploy-cloudflare.yml:56`). Ocurre en el job que luego usa `CLOUDFLARE_API_TOKEN`. Refuta "los pesos son del repo" de PATRONES §6.5.
- **N-08, media (latente).** El sitio y el gateway comparten el mismo KV (`9aef690d…`), la misma D1 `gos-billing` y la misma clave `credits:${appId}`. `@astrojs/cloudflare` ya está instalado: activar SSR convierte a `site/workers/ai.ts`, sin auth, en un escritor anónimo del ledger de facturación del gateway.
- **N-09 a N-11, media (las tres latentes salvo N-10):**
  - `/api/entities/[entity]` expone POST/PUT/DELETE anónimos sobre `'default-instance'`.
  - El gateway acepta `?key=` y reenvía la query, con la key, al origen (`index.ts:103-105, 361`).
  - `GraphExplorer.astro:1071-1139` pinta `innerHTML` sin escapar; 3 bloques JSON-LD usan `set:html={JSON.stringify}`, que no escapa `</script>`; no hay CSP. Hoy no hay payloads en el contenido (grep → 0).
- **N-12, media.** Service worker frente al ciclo de deploy:
  - `PRECACHE_VERSION` es manual y la caché crece sin límite entre deploys.
  - Las navegaciones son cache-first y la revalidación nunca borra ante un 404: una página retirada se sirve para siempre a quien la visitó.
  - El HTML viejo apunta a chunks `/_astro` con hash viejo, que tras el deploy pueden dar 404 (NO VERIFICADO en navegador).
  - La revalidación no va en `waitUntil`, y `isGitHub()` compara por `includes`.
- **N-13, N-14, media.**
  - `labels-sync.yml` borra en cada push a `main` toda etiqueta que no esté en `labels.yml` (solo hay 4): `needs-human`, `high-stakes` y `quarantine` desaparecen. Lo baso en el comportamiento por defecto de la acción, no en una ejecución.
  - Dependabot tiene `cargo` sin `Cargo.toml`, no cubre `worker/` ni pip, y la etiqueta `quarantine` no se aplica.
- **N-15, media.** Las 30 de 30 fichas de sustancia afirman "Dosis culinarias son seguras" sin fuente, y una técnica de aliinasa/mirosinasa errónea para la mayoría. `sulforafano` dice 40 min en un sitio y 10 min en otro de la misma página.
- **N-16, media.** Aun con los `^` restaurados, `verify-dois.py` no sirve como gate:
  - un error de red cuenta como `NORESUELVE`;
  - el comparador por palabras da falsos positivos;
  - solo cubre 44 de ~168 campos `doi:`;
  - los comentarios del código dicen que "escribe `doi_status`", y no lo hace.
- **N-17 a N-26, bajos/info:**
  - `copy-content.js` borra y regenera `site/src/content/dishes` (versionado) en cada build: los arreglos hechos ahí se pierden.
  - `pages.dev` aparece en config (`index.ts:58`, `playwright.config.ts:3`, el spec e2e, `deploy-cloudflare.sh`).
  - Hay artefactos generados versionados y no deterministas.
  - El nombre del secreto no cuadra: `wrangler.toml` dice `SERVICE_SHARED_SECRET`, el código lee `BILLING_SERVICE_SECRET`. Hay 3 esquemas distintos de `api_keys` y los tests no usan `schema.sql`.
  - Huecos de CI: no hay build ni SEO en PRs, `npm install` en vez de `npm ci`, el filtro `paths` no incluye los lockfiles, los e2e no corren nunca y `CLAUDE.md` cita un `verify:protocol` que no existe.
  - En `/agent` solo funciona el tier free en producción.
  - `sync-issues.yml` hace `eval` de títulos sacados de archivos del repo.
  - 20 commits llevan `Co-Authored-By: Claude` (el plan dice 2).
  - Typo `kolesterol` en `HEALTH_CLAIM_RE`.
  - El fix de prototipos es parcial: el patrón sigue en `ask.ts:44` y `pay.ts:27`.

## Correcciones a los informes previos
- **PATRONES:**
  - el gateway `/api/ai/infer` no está sano;
  - F-08 baja de ALTA a BAJA: desde pnpm 10 los builds de dependencias están bloqueados por defecto (`strictDepBuilds` solo convierte el aviso en error);
  - el "hardening global" es la config de la máquina del auditor, no del repo;
  - "los pesos son del repo" es falso;
  - `SearchBar` sí escapa; el sink real es `GraphExplorer`;
  - son 22 deps con `^` sobre 43, no 41; `fast-uri` está en la línea 24.
- **ANOMALIAS:**
  - dice 23, su tabla lista 22, y habla de "20/23 fichas" cuando son 19 sustancias;
  - `oleocanthal` (`10.1038/437045a`) y `dodecenal` (`10.1021/jf0354186`) son, según mi conocimiento bibliográfico (no verificado por red), los artículos correctos; su defecto es el nivel: in vitro publicado como `Medium`;
  - "`acs.jafc` es un journal inexistente" es falso: es el formato actual de los DOI de J Agric Food Chem;
  - las rutas que cita no son la fuente de los datos.
- **ROBUSTEZ:**
  - en servidor el `used` del body no decide nada: el corte usa siempre 0 (`llm.ts:31-39`);
  - el test de auditoría no es una línea base, es un candado contra los arreglos.
- **GATES-CI:**
  - `public/sitemap.xml` sí está versionado;
  - el control `year:'not-a-year'` mutó `vitamins`, que no tiene esquema de `studies`; en `substances` sí se valida `z.number()`;
  - `astro check` no corre en el deploy (el workflow llama a `astro build`, no a `pnpm run build`);
  - `doi_status` sí se escribe: 8 entradas a mano.
- **PWA-OFFLINE:** `isSeeded()` no está corregido, y `STATIC_ASSETS` tiene 18 entradas, no 17.

## Mensajes de commit frente al código
| Commit | Veredicto |
|---|---|
| `815459b7` | **Falso** (N-01). |
| `8ccef08d` | Son 8 tests, pero la lógica está invertida (N-05). |
| `5ce0da3f` | Fix parcial (N-26). |
| `6eff94c0`, `7e9ff3ae`, `ad7978e6`, `041ddcd3` | Ciertos en código local; sin publicar. |
| `ad7978e6` | Su conteo de MISMATCH tenía 2 falsos positivos (lo admite su propio sucesor). |
| `ef384f12` | El criterio High/Medium/Low no se aplicó de forma coherente (`piperina` High, `oleocanthal`/`dodecenal` Medium). |
| `eb8195af` | Su "585 de 585 recetas" es `dishes/` raíz; el sitio publica 495. |
| `ac3e0496` | El agente queda "conectado" solo para el tier free. |
| Todas las cifras de tests y mutaciones | NO VERIFICADAS. |

## Reglas duras en `815459b7`
| Regla | Estado |
|---|---|
| Cero DOI inventados | Incumplida (limoneno) |
| `evidence_level` solo High/Medium/Low | Incumplida (43 valores fuera) |
| Revisión narrativa ≠ ensayo clínico | Incumplida (`sulforafano` High) |
| `pages.dev` fuera de canonical/OG/sitemap/feed/config | Cumplida en la salida; incumplida en config |
| `pending_review` con `noindex` y fuera del sitemap | Cumplida |
| Ningún secreto en repo ni historial | Incumplida en historial y en `origin/main` (valores [REDACTED]) |

## Huecos que siguen abiertos
1. Todo lo dinámico: suites, build, gates, producción, Crossref, `pnpm audit`.
2. El barrido completo de secretos en el historial (necesita gitleaks).
3. El estado real de GitHub: ramas, Apps que disparan `check_suite`, push protection.
4. El estado de Cloudflare: plan de KV, `BILLING_URL`, filas de `api_keys`, rotación de las claves.
5. El cotejo de los ~20 DOI marcados y de los 4 que están fuera de `substances`. No propongo DOI concretos sin verificarlos en red.
6. Una prueba del SW con dos deploys reales.

## Estado del repo al terminar
`git status --porcelain --untracked-files=all` da **3 líneas, ninguna mía**:
```
 M site/public/api/ingredients/by-origin.json
 M site/public/api/ingredients/variants.json
 M site/public/api/vectors/index.json
```
Las dejó el `generate` del proceso concurrente a las 20:33; yo no puedo ejecutar `node`. No creé ningún archivo, porque el informe fue denegado; no muté, no borré, no commiteé ni publiqué. Hay que congelar la rama mientras se audita: con otro agente commiteando, cualquier informe sobre "HEAD" caduca en minutos.
