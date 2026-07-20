# GOS — Architecture Vision & Unified Plan

> **Proyecto:** gastronomic-open-standard-GOS  
> **Goal:** Hub de datos gastronómicos + RAG + Asistente de cocina IA (PWA/WebGPU/LLM Local)  
> **Framework:** GitCore Protocol v3.7 (iberi22/GitCore)  
> **Sistema de Recompensas:** Nodos SWAL con incentivos por persistencia de datos  
> **Inspiración arquitectónica:** shelf (edge-mesh, WebGPU agent, p2p-mesh-core)

---

## 1. Architecture Vision

### 1.1 Goal
GOS pasa de ser un estándar abierto de recetas a ser:
1. **Repositorio de datos canónico** para `hosteler-ia` (RAG vectorial)
2. **Asistente de cocina IA** (PWA con WebGPU + LLM local)
3. **Nodo SWAL** con incentivos por persistir y servir datos
4. **Piloto del sistema de recompensas SWAL**

### 1.2 Componentes

```
┌─────────────────────────────────────────────────────┐
│                    GOS Ecosystem                       │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────┐    ┌──────────────────┐        │
│  │  GOS Data Core   │    │  RAG Vector Store  │        │
│  │  (recetas,       │◄──►│  (embeddings de    │        │
│  │   ingredientes,  │    │   recetas para     │        │
│  │   técnicas,      │    │   búsqueda         │        │
│  │   grafo)         │    │   semántica)       │        │
│  └────────┬─────────┘    └────────┬──────────┘        │
│           │                       │                    │
│           ▼                       ▼                    │
│  ┌──────────────────────────────────────────┐         │
│  │       GOS Kitchen Assistant (PWA)          │         │
│  │  ├── Chat IA (WebGPU + LLM local)         │         │
│  │  ├── RAG vía embeddings + recetas          │         │
│  │  ├── Grafo de conocimiento visual          │         │
│  │  ├── Offline-first (Service Worker)        │         │
│  │  └── Modo cocina (manos libres, voz)       │         │
│  └────────────────┬─────────────────────────┘         │
│                   │                                    │
│                   ▼                                    │
│  ┌──────────────────────────────────────────┐         │
│  │       SWAL Node / Mesh Layer               │         │
│  │  ├── edge-mesh (P2P sync entre nodos)     │         │
│  │  ├── p2p-mesh-core (roles, permisos)      │         │
│  │  ├── gpu-agent (WebGPU inference local)   │         │
│  │  └── Sistema de recompensas (SWAL)        │         │
│  └──────────────────────────────────────────┘         │
│                                                       │
│  ┌──────────────────────────────────────────┐         │
│  │       hosteler-ia (Restaurant Platform)   │         │
│  │  ├── Consume GOS Data via API/RAG         │         │
│  │  ├── Inventario, menú QR, cocina          │         │
│  │  └── Pro features via nodo SWAL           │         │
│  └──────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────┘
```

### 1.3 Stack Tecnológico

| Capa | Tecnología | Inspiración |
|------|-----------|-------------|
| **PWA** | Astro + Tailwind (existente) o Next.js (como hosteler-ia) | Actual GOS site |
| **RAG** | Embeddings + Vector Store (local-first, Dexie/IDB) | hosteler-ia hooks |
| **LLM Local** | WebGPU via `gpu-agent` + modelos GGUF/ONNX | shelf/packages/gpu-agent |
| **P2P Sync** | Yjs + PeerJS via `edge-mesh` | shelf/packages/edge-mesh |
| **Datos** | Markdown estructurado + JSON + embeddings precomputados | GOS actual |
| **Autenticación** | xavier (memoria) + GitHub OAuth | SWAL estándar |
| **Workflow** | GitCore Protocol v3.7 | GitCore |
| **Recompensas** | Sistema SWAL (nodos activos) | SWAL |

---

## 2. Roadmap de Implementación

### FASE 1: Limpieza y Unificación del Repo
**Objetivo:** Unificar `gos-pwa`, `gos-pwa-data`, `gos-p2p-data` y el `.bak` dentro de GOS, eliminar duplicados.

- [ ] Mover datos de `gos-pwa-data/` a `site/public/data/`
- [ ] Mover PWA de `gos-pwa/` a `site/extensions/` si es relevante
- [ ] Eliminar `gastronomic-open-standard-GOS.bak` (apunta a xavier, incorrecto)
- [ ] Eliminar `gos-pwa` si es redundante con `site/`
- [ ] Consolidar `gos-p2p-data/` en `data/p2p/`
- [ ] Adoptar GitCore v3.7 (copiar `.gitcore`, `AGENTS.md`, hooks, workflows)

### FASE 2: Motor de Embeddings y RAG
**Objetivo:** Precomputar embeddings de todas las recetas + ingredientes para búsqueda semántica.

- [ ] Script Python/TS para generar embeddings de `dishes/*.md` y `ingredients/*.md`
- [ ] Vector store en JSON + Dexie (IndexedDB) para el PWA
- [ ] API endpoint `GET /api/search?q=...` con búsqueda semántica
- [ ] API endpoint `GET /api/recipes/recommend?ingredients=...`
- [ ] Integrar RAG existente de hosteler-ia (`src/lib/ai/`)

### FASE 3: Asistente de Cocina PWA (WebGPU + LLM Local)
**Objetivo:** Asistente de cocina que corre el LLM 100% local via WebGPU.

**Inspiración directa de shelf/packages/gpu-agent:**
- [ ] Portar `gpu-agent` a GOS como `packages/gpu-agent` (WebGPU inference runtime)
- [ ] UI de chat conversacional con contexto de recetas
- [ ] Modo cocina (manos libres): comandos de voz, respuestas de voz
- [ ] Conversión de unidades, sustitución de ingredientes, escalado de recetas
- [ ] Offline-first: Service Worker + IndexedDB + embeddings locales
- [ ] Grafo de conocimiento visual (D3.js / vis-network)

### FASE 4: Mesh Layer + Nodos SWAL
**Objetivo:** Red P2P de nodos que persisten y sirven datos culinarios.

**Inspiración directa de shelf/packages:**
- [ ] Portar `p2p-mesh-core` como `packages/p2p-mesh-core` (roles, permisos)
- [ ] Portar `edge-mesh` como `packages/edge-mesh` (Yjs sync)
- [ ] Portar `edge-mesh-react` como `packages/edge-mesh-react` (hooks React)
- [ ] Sistema de recompensas: validación de integridad de datos, uptime, contribuciones
- [ ] Reputación de nodos: qué nodos aportan datos de calidad
- [ ] Sincronización de nuevos ingredientes/recetas entre nodos

### FASE 5: Integración hosteler-ia
**Objetivo:** hosteler-ia consume datos GOS vía RAG + API.

- [ ] API endpoints estables para hosteler-ia
- [ ] Hooks React tipo `useGOSRecipes`, `useGOSIngredientSubstitution`
- [ ] Predicciones de inventario basadas en datos GOS (estacionalidad, tendencias)
- [ ] Botón "Pro" = tener nodo SWAL activo

### FASE 6: Sistema de Recompensas SWAL (Piloto)
**Objetivo:** Primer piloto del sistema de incentivos de SWAL.

- [ ] Token/reputación por persistir datos GOS
- [ ] Validación automática de contenido nuevo vía CI/CD
- [ ] Leaderboard de nodos contribuyentes
- [ ] Dashboard en SWAL-Operations-Dashboard
- [ ] Documentación para onboardear nuevos nodos

---

## 3. Actualización GitCore Protocol

GOS debe adoptar GitCore v3.7 como protocolo de desarrollo:

```
gastronomic-open-standard-GOS/
├── .gitcore/               # GitCore protocol config
│   ├── docs/
│   │   ├── SWAL_GOAL.md    # Alineado con docs/SWAL/GOAL.md
│   │   └── PROJECT_MAP.md  # Mapa de proyecto
│   └── hooks/              # Git hooks
├── AGENTS.md               # Agent context (GitCore estándar)
├── TASK.md                 # Session state
└── .github/workflows/      # CI/CD workflows
```

### Decisiones Técnicas Registradas (ADR)

| ID | Decisión | Contexto |
|----|----------|----------|
| ADR-001 | GOS como repo único (no monorepo) | Unificar datos + PWA en un solo repo simplifica RAG |
| ADR-002 | WebGPU vía shelf/gpu-agent port | Ya existe y funciona, shelf probado en producción |
| ADR-003 | Embeddings precomputados + streaming | Evitar latencia de GPU en tiempo real |
| ADR-004 | Markdown como fuente de verdad | Git-friendly, fácil de contribuir, CI-validable |
| ADR-005 | Rewards basados en integridad + uptime | No solo cantidad, calidad importa para datos culinarios |

---

## 4. Issues para Jules (Primeros pasos)

Basado en el diseño, los primeros issues pequeños (1-3 archivos):

1. **chore: adopt GitCore v3.7 protocol in GOS**
   - Copy `.gitcore/`, `AGENTS.md`, workflows de GitCore
   - Crear `docs/SWAL/GOAL.md` alineado

2. **feat: unify gos-pwa-data into site/public/data**
   - Mover `gos-pwa-data/` a `site/public/data/`
   - Actualizar referencias en Astro componentes

3. **feat: add embeddings generation script for recipes**
   - Script Python/TS que recorre `dishes/` y genera embeddings JSON
   - Output a `site/public/data/embeddings.json`

4. **feat: port gpu-agent package for WebGPU inference**
   - Copiar shelf/packages/gpu-agent a packages/gpu-agent
   - Adaptar a contexto GOS

5. **feat: add semantic search API endpoint**
   - `GET /api/search?q=...` con cosine similarity sobre embeddings
   - Endpoint en Astro API routes

6. **feat: kitchen assistant chat UI with WebGPU**
   - Chat interface + integración con gpu-agent
   - Modo conversacional con RAG sobre recetas

7. **feat: port edge-mesh and p2p-mesh-core packages**
   - Red P2P para nodos SWAL
   - Sistema de rewards básico

---

## 5. Próximos Pasos Inmediatos

1. ✅ Tú y yo revisamos y ajustamos este plan
2. Crear issues en GitHub para Jules (1 feature = 1 issue pequeño)
3. Jules implementa issue por issue
4. Verificamos y mergeamos
5. Repetir

¿Quieres que ajuste algo del plan antes de lanzar los primeros issues a Jules?
