# gastronomic-open-standard-GOS — Software Requirements Specification (SRS)

> **Protocol:** GitCore 3.8.0  
> **Updated:** 2026-07-17  
> **Status target:** 100% structure complete · content kept in sync with code

## Estado actual

| Métrica | Valor |
|---------|-------|
| Requisitos totales | 7+ |
| Structure complete | ✅ 100% |
| Content status | draft (structure complete) |
| Synced ratio (drift) | n/a (local) |

## Documents (mandatory)

| Doc | Purpose |
|-----|---------|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | REQ-IDs, acceptance criteria, file traces |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Component map, constraints, SWAL alignment |

## Optional (domain)

- `NON-FUNCTIONAL.md` — performance, security, privacy  
- `INTERFACES.md` — APIs, MCP, mesh messages  
- `DATABASE.md` — schema / storage of **business** data (not Xavier paths)

## Rules

1. Every feature in `.gitcore/features.json` maps to ≥1 REQ-ID.  
2. Pro/subscription REQs must reference **SWAL node**, never Stripe.  
3. Multi-instance data isolation: `app_id` + `instance_id`.  
4. Agentic memory requirements point to **Xavier** (HTTP/MCP), outside business DB.

## Pipeline (local)

| Fase | Tool | Notes |
|------|------|-------|
| Mapa técnico | `GitCore/scripts/mapa-tecnico.py` | When available in project |
| Enlazar SRS | `GitCore/scripts/enlazar-srs.py` | Hyperlinks REQ ↔ code |
| Drift | `GitCore/scripts/drift-detector.py` | Optional local |

## Cross-links

- [SRC.md](../../SRC.md) — repository map  
- [AGENTS.md](../../AGENTS.md) — agent rules  
- [SWAL roadmap](../../../docs/SWAL/README.md) — ecosystem (if monorepo)  

