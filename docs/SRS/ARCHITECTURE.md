# gastronomic-open-standard-GOS — SRS Architecture map

> **Protocol:** GitCore 3.8.0 · **Updated:** 2026-07-17

## System context

```
┌─────────────────────────────────────────────────────────────┐
│  gastronomic-open-standard-GOS (L4 product or L2/L3 library)             │
│  Business DB / local state  ·  UI / API                     │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
                ▼                         ▼
         Xavier (L3)               edge-mesh (L2)
         memory / MCP              namespaces by instance
                │                         │
                └──────────┬──────────────┘
                           ▼
                    $SWAL economic core (L0–L1)
                    node identity · optional stake
```

## Non-negotiables (SWAL)

1. Business data ≠ mesh bulk storage ≠ chain blobs  
2. Pro = SWAL node active (not Stripe)  
3. Multi-instance isolation by default  
4. Xavier for agentic memory  
5. GitCore protocol files always present  

## Components

| Component | Responsibility | REQ |
|-----------|----------------|-----|
| App domain modules | Business logic | domain REQs |
| SwalNode gate | Pro enablement | REQ-003 |
| Xavier client | Agentic memory | REQ-005 |
| Mesh adapter | P2P work data | REQ-004 |
| GitCore meta | Process compliance | REQ-001 |

## Deployment / privacy

- Repository visibility: **private** (default)  
- CI: local or `.github/workflows.disabled`  
- Secrets: env only  

## Related

- [REQUIREMENTS.md](./REQUIREMENTS.md)  
- [SRC.md](../../SRC.md)  
- Ecosystem: monorepo `docs/SWAL/README.md`  

