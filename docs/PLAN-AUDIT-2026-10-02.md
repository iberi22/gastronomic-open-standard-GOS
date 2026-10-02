# GOS — Plan por fases: auditoría, patrones, seguridad y validación CC

Fecha: 2026-10-02
Repo: `gastronomic-open-standard-GOS` (este repo)
HEAD al arrancar: `035e89b7`
Superficie: 14 páginas Astro, 11 endpoints, 495 recetas, 552 ingredientes,
30 substancias, worker de 402 LOC, 8.121 LOC en `site/src/lib`, 21 archivos de test.

## Por qué este plan existe

La ola anterior de 4 subagentes reportó "todo verde" y no era cierto: el fix de
seguridad se había perdido, `npm test` no existía y 35 de 54 tests fallaban.
Dos lessons que condicionan todo lo de aquí:

1. **Un subagente que dice "verde" no es evidencia.** Hay que correr sus comandos.
2. **Un control negativo que no ejecutó los tests no es control negativo.**
   (Ya Twice pasó: cwd equivocado → "No test files found" → falso verde.)

Por eso este plan no termina en "los agentes reportan". Termina en gates ejecutados
y una validación independiente con Claude Code Opus 5.5 xhigh.

---

## FASE 0 — Consolidar línea base (mía, antes de delegar)

Objetivo: que los subagentes hereden un repo verificable, no una promesa.

- [x] Verificar HEAD y árbol limpio
- [x] Confirmar el comando de CC: `claude -p --model claude-opus-4-1 --effort xhigh`
      (el CLI remapea a Opus 5.5 y lo dice; `xhigh` aceptado, medido)
- [ ] Congelar una baseline numérica reutilizable que todo el mundo pueda repetir
- [ ] Etiquetar los commits de esta ola para que CC sepa qué diff auditar

**Entregable:** `docs/audit/BASELINE-2026-10-02.md` con las cifras medidas.

---

## FASE 1 — Patrones inseguros y superficie de ataque (subagente A)

**Isla:** `docs/audit/PATRONES-INSEGUROS.md` (crear). Solo lee código.

Qué tiene que buscar, con criterio de *alcanzabilidad*, no de "suena raro":

1. **Mismo patrón que el bypass, en otro sitio.** El bypass era: el cliente
   declara su propio privilege y el servidor lo cree. Ya se encontró una
   copia en `/api/ai/ask` (`tierId` del body). Busca el mismo patrón en:
   - `/api/ai/infer.ts` (delega al worker con `mockEnv` si no hay bindings)
   - `site/src/pages/api/agent/catalog.json.ts`
   - cualquier endpoint que confíe en un campo del body para decidir acceso
2. **Bypass equivalents por contenido.** ¿algún sitio acepta una credencial
   por `includes()`, prefijo, longitud o hash parcial?
3. **Fallo abierto vs cerrado.** Cada `catch` de autenticación, billing o
   persistencia: ¿degrada a negar o a permitir?
4. **Secretos y credenciales en el repo.** Including git history
   (`git log -p | grep`), no solo el working tree.
5. **Supply chain**: `package.json` de root, site y worker — dependencias sin
   lockfile pinneado, scripts de pre/postinstall, deps sin provenance.

Prohibido: modificar código. Solo el informe.
**Skills a cargar:** `secret-scanning`, `supply-chain-security`,
`javascript-supply-chain-hardening`, `security-audit`.
**Verificación:** el informe debe citar `archivo:línea` por cada hallazgo, y
distinguir EXPLOTABLE de SOSPECHOSO de TEÓRICO. Un hallazgo sin ruta de
alcance concreto va marcado como tal, no como vulnerabilidad.

---

## FASE 2 — Anomalías de datos y evidencia científica (subagente B)

**Isla:** `docs/audit/ANOMALIAS-DATOS.md` (crear). Solo lee contenido.

La regla dura de GOS, ya incumplida una vez: **cero DOI inventados**. Se
permiten `High`/`Medium`/`Low` en `evidence_level` y nada inventado.

1. **Los 61 DOI publicados**: resuelven por HTTP, y el título/año del DOI
   coincide con lo que el `.md` afirma. Coincidencia débil = NO es evidencia.
2. `doi_status: unverified` publicado como verificado → marcar y no contar.
3. **Niveles de evidencia incoherentes con el diseño del estudio**: una
   revisión narrativa no es ensayo clínico; un estudio in vitro no es clínico.
   Cada nivel asignado debe poder defenderse leyendo el abstract.
4. **Los 495 recetas**: campos vacíos, valores 0 reales, "Unknown"/"TODO" que
   se publiquen como dato, unidades incoherentes, duplicados de slug.
5. **Los 552 ingredientes**: coherencia de los datos cientificos, y los 515 que están en
   `pending_review` — confirmar que ninguno es indexable ni está en el sitemap.
6. Las 30 substancias: contraindicaciones y efectos citados con referencia real.

Prohibido: editar contenido. Solo informe.
**Skills a cargar:** `grounded-citations`, `web-research`,
`mandatory-web-research`, `srs-src-drift-detector`.
**Verificación:** todo DOI tocado va con el HTTP status y la URL de Crossref o
PubMed de respaldo. Sin eso, el hallazgo no se cuenta.

---

## FASE 3 — Robustez de lo que los subagentes escribieron (subagente C)

**Isla:** `docs/audit/ROBUSTEZ-AGENTE-PWA.md` (crear). Solo lee y ejecuta tests.

Lo entregado por la ola anterior nunca pasó por una revisión adversarial:

1. **`/api/ai/ask` y `llm.ts`**: ¿el filtro de citas resiste un LLM que invente
   ids con formato válido pero que no existen? ¿Y que cite una fuente real
   con una afirmación que esa fuente no dice?
2. **El peaje por tier**: con `used`/`tierId` controlados por el cliente,
   ¿se puede gastar crédito de otro, o saltarse el corte de cuota?
3. **`offline-seed.ts` y el service worker**: ¿qué se cachea? ¿se cachea algo
   con `noindex` o datos de otro usuario? ¿el SW sobrevive a un `dist` distinto?
4. **`indexeddb.ts`**: el bucle de reparación, ¿puede quedar en ciclo infinito
   bajo concurrencia de dos pestañas? Ya se midió que `onblocked` aparece con
   conexiones abiertas — ¿el código lo maneja o se cuelga?
5. **Los tests que los subagentes declararon verdes**: ¿siguen verdes? ¿miden
   algo o solo ejecutan código? Corre control negativo por mutación al menos
   en los 3 contratos que importan (tier free no gasta, cita inventada se
   descarta, store faltante se repara).

Prohibido: editar código de producción. Puede añadir tests en
`site/src/lib/*.audit.test.ts` y el informe.
**Skills a cargar:** `subagent-output-truncation`, `review`, `systematic-debugging`,
`test-writer-fixer`.
**Verificación:** los gates que se ejecuten van con su salida real pegada. Si un
test que los subagentes declararon verde ahora falla, eso es un hallazgo de
primer nivel, no un detalle.

---

## FASE 4 — Puertas: CI, SEO, evidencia y build (subagente D)

**Isla:** `docs/audit/GATES-CI.md` (crear). Solo lee y ejecuta.

El repo tiene gates; lo que no está probado es que **fallen cuando deben**.

1. Ejecutar la matriz completa en el HEAD actual y registrar la salida real:
   lint, `astro check`, vitest site, vitest worker, `astro build`,
   `verify-sitemap-seo.mjs`.
2. **Cada gate, con control negativo.** Un gate que nunca se ha visto fallar
   no es un gate, es decorado. Para cada uno: mutar la condición, ver que da
   RC≠0, restaurar, ver que vuelve a RC=0.
   - SEO: canonical mal, hreflang, host viejo en sitemap, ruta huérfana
   - Evidencia: DOI que no resuelve, `doi_status` degradado
   - Auth: el bypass reintroducido
   - Build: una página que rompa el schema de contenido
3. `.github/workflows/deploy-cloudflare.yml`: ¿el pipeline ejecuta los mismos
   gates que yo corro a mano? Si hay divergencia entre lo que CI corre y lo que
   se ejecuta antes de un deploy, eso es un hallazgo.
4. ¿Existe un gate que verifique que **cada DOI publicado** resuelve? (Hoy el
   script de evidencia es ad-hoc, no parte del CI.)

Prohibido: tocar `.github/`. Solo informe.
**Skills a cargar:** `github-code-review`, `devops-automator`, `review`,
`delivery-verification-gate`.
**Verificación:** para cada control negativo, el RC antes, el RC durante la
mutación y el RC restaurado. Tres números, no una afirmación.

---

## FASE 5 — Validación independiente con Claude Code (Opus 5.5 xhigh)

**Esto es lo que el usuario pidió explícitamente, y es la fase que más valor
aporta: un modelo distinto, con contexto limpio, que audite todo lo anterior
sin ver ninguno de mis conclusiones.**

Comando verificado:

    cd <raíz-del-repo>   # el repo actual, sin ruta absoluta
    env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL \
      claude -p --model claude-opus-4-1 --effort xhigh "<prompt>"

El CLI remapea `claude-opus-4-1` → **Opus 5.5** y lo anuncia. `xhigh` medido
como aceptado. Tarda ~6 min: escribe al final, 0 bytes no es cuelgue.

**Isla de CC:** ninguna. Puede leer y escribir. Se le da:

- El prompt: el estado real del repo, los 5 informes de las fases 1-4, y la
  lista explícita de lo que NO debe dar por cierto (los reportes de la ola
  anterior todos resultaron falsos).
- Skills: `security-audit`, `supply-chain-security`, `secret-scanning`,
  `grounded-citations`, `review`, `systematic-debugging`, `web-research`.
- **Instrucción de trabajar:** reportar a un archivo
  `docs/audit/CC-VALIDATION-2026-10-02.md`, no a stdout, porque el proceso
  tarda y un output largo se trunca.

Lo que CC debe hacer y Hermes no puede:
1. **Rechazar las conclusiones previas.** Default escéptico: cada afirmación
   de los informes 1-4 se verifica o se marca como no verificada.
2. Buscar lo que los cuatro subagentes *no* buscaron, por sesgo de prompt.
3. Verificar que los commits de esta ola dicen la verdad en sus mensajes.

---

## FASE 6 — Cierre (mía)

- [ ] Consolidar los 5 informes + el de CC en un único veredicto
- [ ] Separar: CRÍTICO (explotable en producción) / ALTO / MEDIO / DEUDA
- [ ] Correr los gates una vez más sobre el estado final
- [ ] Decidir con el usuario qué se arregla ahora y qué se agenda
- [ ] Actualizar `docs/audit/` con el índice y guardar en Xavier

---

## Reglas que no se rompen en este plan

1. Ningún subagente hace commit, push ni deploy. Eso es mío, al final.
2. Ningún subagente toca credenciales. Valores siempre `[REDACTED]`.
3. Ningún subagente borra archivos del árbol (ya pasó: uno borró
   `site/public/api/vectors/`, 11,6 MB, y hubo que restaurar).
4. Toda cifra se deriva de una medición ejecutada, no de un conteo de líneas
   ni de un reporte heredado.
5. Un informe sin `archivo:línea` o sin comando reproducible no se acepta.
6. `gos.swal.network` es el único dominio canónico; `pages.dev` no aparece
   en canonical, OG, sitemap, feed ni config.
7. Nada se afirma como desplegado sin comprobar `https://gos.swal.network`.
8. Las skills del gate siguen encoladas: crearlas no las activa. Para usar
   una, hay que pasarla por `/skills approve`.

## Pendientes que quedan fuera de este plan (decisión del usuario)

- Los 2 commits antiguos (`43210fc3`, `525519d5`) con la firma falsa
  `Co-Authored-By: Claude Opus 4.8 (1M context)`. Necesitan otro force-push
  para limpiarse. Los 7 de la ola actual ya están limpios.
