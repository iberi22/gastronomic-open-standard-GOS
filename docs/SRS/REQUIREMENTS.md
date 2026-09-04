# Software Requirements Specification — gastronomic-open-standard-GOS

> **Protocol:** GitCore 3.8.0 · **Updated:** 2026-07-17  
> IEEE 830 reduced. Structure **100%**. Keep REQ-IDs in sync with code.

## REQ-001: Protocol compliance (GitCore)

- **Category:** Process  
- **Priority:** High  
- **SRS Estado:** `draft`  
- **Files:** `AGENTS.md`, `.gitcore/ARCHITECTURE.md`, `.git-core-protocol-version`, `SRC.md`, `docs/SRS/`

### Descripción
El repositorio cumple GitCore 3.8.0: lectura de agentes, planning local, SRC y SRS presentes.

### Criterios de aceptación
- [ ] `.git-core-protocol-version` = 3.8.0
- [ ] `AGENTS.md` define orden de lectura
- [ ] `.gitcore/planning/PLANNING.md` y `TASK.md` existen
- [ ] `SRC.md` completo (secciones obligatorias)
- [ ] `docs/SRS/{index,REQUIREMENTS,ARCHITECTURE}.md` existen

---

## REQ-002: Source map (SRC)

- **Category:** Documentation  
- **Priority:** High  
- **SRS Estado:** `draft`  
- **Files:** `SRC.md`

### Descripción
SRC.md describe árbol real, build/test, y enlaces a SRS/.gitcore.

### Criterios de aceptación
- [ ] Tree refleja módulos reales
- [ ] Comandos build/test documentados
- [ ] Cross-links a docs/SRS y AGENTS.md

---

## REQ-003: SWAL node Pro gate (product apps)

- **Category:** Functional  
- **Priority:** High (N/A for pure libraries)  
- **SRS Estado:** `draft`  
- **Files:** *(app-specific Pro gate modules)*

### Descripción
Funciones Pro se habilitan solo con **nodo SWAL activo**. No Stripe para Pro.

### Criterios de aceptación
- [ ] No hay Checkout/webhook Stripe como unlock Pro
- [ ] Gate documentado Free vs Pro
- [ ] Heartbeat/identidad de nodo definido o planificado

---

## REQ-004: Instance isolation (mesh / multi-workspace)

- **Category:** Functional  
- **Priority:** High (N/A if single-tenant tool)  
- **SRS Estado:** `draft`  
- **Files:** *(storage / mesh namespace modules)*

### Descripción
Dos instancias de la misma app no mezclan datos de negocio por defecto. Namespace `swal/{app_id}/{instance_id}`.

### Criterios de aceptación
- [ ] `instance_id` persistido por workspace
- [ ] Sync cruzado solo con vínculo opt-in
- [ ] Memoria Xavier namespaced por instance

---

## REQ-005: Agentic memory (Xavier)

- **Category:** Functional  
- **Priority:** High  
- **SRS Estado:** `draft`  
- **Files:** *(xavier client / config)*

### Descripción
Memoria agentic vía Xavier HTTP (`:8006`) y/o **MCP**, fuera de la BD de negocio.

### Criterios de aceptación
- [ ] Paths de memoria documentados
- [ ] No se persiste working memory agentic solo en DB de dominio
- [ ] Fallo de Xavier no corrompe datos de negocio

---

## REQ-006: Security & secrets

- **Category:** Non-functional  
- **Priority:** High  
- **SRS Estado:** `draft`  
- **Files:** `.gitignore`, `.env.example`, `SECURITY.md` (if any)

### Descripción
Sin secretos en git; `.env.example` sin valores reales.

### Criterios de aceptación
- [ ] `.env` gitignored
- [ ] No API keys en docs de ejemplo
- [ ] Repo **private** salvo excepción documentada

---

## REQ-007: Local CI preference

- **Category:** Process  
- **Priority:** Medium  
- **SRS Estado:** `draft`  
- **Files:** `.github/workflows.disabled/` (if present)

### Descripción
GitHub Actions desactivados por defecto en era privada SWAL; tests locales preferidos.

### Criterios de aceptación
- [ ] Workflows no se ejecutan en GitHub (disabled/moved)
- [ ] Comandos de test locales en SRC.md

---

*Add domain-specific REQ-008+ below. Keep numbering stable.*

---

## REQ-008: Recipe Schema (feature feat-recipe-schema)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature feat-recipe-schema)*

### Description
Structured recipe format with YAML frontmatter validation

*Feature: `feat-recipe-schema` · status: passing*

## REQ-009: Ingredient Database (feature feat-ingredient-database)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature feat-ingredient-database)*

### Description
Scientific ingredient metadata with nutritional information

*Feature: `feat-ingredient-database` · status: passing*

## REQ-010: Astro Site (feature feat-astro-site)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature feat-astro-site)*

### Description
Static site generation with Astro 5.x + Svelte

*Feature: `feat-astro-site` · status: passing*

## REQ-011: Recipe Translation (feature feat-recipe-translation)

- **Category:** Functional
- **Priority:** P2
- **SRS Status:** `active`
- **Files:** *(see .gitcore/features.json feature feat-recipe-translation)*

### Description
Batch translation of recipes using Gemini API

*Feature: `feat-recipe-translation` · status: failing*
