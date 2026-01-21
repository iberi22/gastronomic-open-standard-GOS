# 🗺️ Documentación: De Caos a Diátaxis

## 📊 Estructura Anterior vs. Nueva

### ❌ Antes: Mezcla Confusa

```
docs/
├── ADAPTIVE_WORKFLOWS.md      # ¿Guía? ¿Spec? ¿Explicación?
├── ATOMIC_COMMITS.md           # ¿Tutorial? ¿Referencia?
├── SESSION_EXPORT.md           # ¿Cómo hacer? ¿Teoría?
├── CLI_TRUST.md                # Explicación mezclada
├── COMMIT_STANDARD.md          # Referencia escondida
├── guides/ (vacía o redundante)
└── agent-docs/ (bien organizada) ✅
```

**Problemas:**

- 🤔 No está claro dónde buscar
- 😵 Mezcla tutoriales con referencia
- 📚 Difícil crear una wiki navegable
- 🤖 Humanos y agentes compitiendo por espacio

---

### ✅ Ahora: Framework Diátaxis

```
docs/
├── 📖 tutorials/           # APRENDER haciendo
│   ├── README.md           # "Quiero aprender"
│   └── ATOMIC_COMMITS.md   # Lección práctica
│
├── 🎯 how-to/              # RESOLVER problemas
│   ├── README.md           # "Necesito hacer X"
│   └── SESSION_EXPORT.md   # Receta paso a paso
│
├── 📚 reference/           # CONSULTAR datos
│   ├── README.md           # "¿Cuál es la sintaxis?"
│   └── COMMIT_STANDARD.md  # Especificación técnica
│
├── 💡 explanation/         # ENTENDER el "por qué"
│   ├── README.md           # "¿Por qué funciona así?"
│   └── CLI_TRUST.md        # Contexto y filosofía
│
├── 🤖 agent-docs/          # Para AI Agents
│   ├── specs/              # Especificaciones técnicas
│   ├── research/           # Investigaciones
│   ├── prompts/            # Prompts reutilizables
│   └── sessions/           # Sesiones archivadas
│
├── 📂 setup/               # Instalación inicial
│   └── AUTOMATION_SETUP.md
│
├── 🌐 wiki/                # Mirror de GitHub Wiki
│   └── Home.md             # Punto de entrada
│
└── 📝 README.md            # Índice principal
```

---

## 🧭 El Framework Diátaxis

### Los 4 Cuadrantes

```
         📚 ¿Qué hacer?                  🎯 Tengo un problema

         TUTORIALS                       HOW-TO GUIDES
       (Learning)                        (Tasks)

       "Enséñame"                        "Ayúdame a hacer X"

────────────────────┼──────────────────────────────────────

       EXPLANATION                       REFERENCE
       (Understanding)                   (Information)

       "¿Por qué?"                       "¿Cómo se llama?"

         💭 Entender                      📖 Buscar
```

### Ejemplo: Commits Atómicos

| Tipo | Ubicación | Pregunta que responde |
|------|-----------|----------------------|
| **Tutorial** | `tutorials/ATOMIC_COMMITS.md` | "¿Cómo aprendo a hacer commits atómicos?" |
| **How-To** | `how-to/CREATE_ATOMIC_COMMIT.md` | "¿Cómo separo estos cambios?" |
| **Reference** | `reference/COMMIT_STANDARD.md` | "¿Cuál es el formato exacto?" |
| **Explanation** | `explanation/WHY_ATOMIC.md` | "¿Por qué es importante la atomicidad?" |

---

## 👥 Para Humanos vs. 🤖 Para Agentes

### Separación Clara

| Audiencia | Carpeta | Propósito |
|-----------|---------|-----------|
| 👨‍💻 **Humanos** | `tutorials/`, `how-to/`, `reference/`, `explanation/` | Aprender, trabajar, entender |
| 🤖 **AI Agents** | `agent-docs/` | Especificaciones técnicas, contexto |
| 🚀 **Nuevos usuarios** | `setup/` | Instalación y configuración |
| 🌐 **Navegación web** | `wiki/` | Mirror de GitHub Wiki |

### Beneficios

- ✅ No más competencia por espacio
- ✅ Agentes tienen contexto técnico rico
- ✅ Humanos tienen guías amigables
- ✅ Wiki navegable para todos

---

## 📖 GitHub Wiki Integration

El contenido de `docs/wiki/` se sincroniza automáticamente con GitHub Wiki.

### Estructura de la Wiki

```
Home
├── Tutorials/
│   ├── Atomic-Commits
│   ├── First-Workflow
│   └── Setup-Project
├── How-To-Guides/
│   ├── Session-Export
│   ├── Automation-Setup
│   └── AI-Agents
├── Reference/
│   ├── Commit-Standard
│   ├── CLI-Commands
│   └── Configuration
└── Explanation/
    ├── CLI-Trust
    ├── Issues-Not-Files
    └── Architecture
```

**Ventajas:**

- 🔗 URLs limpias: `/wiki/Tutorial-Atomic-Commits`
- 🔍 Búsqueda integrada de GitHub
- 📱 Mobile-friendly automático
- 🌐 Acceso público

---

## 🎨 Ventajas del Nuevo Sistema

### Para Desarrolladores

| Necesidad | Solución |
|-----------|----------|
| "Soy nuevo, ¿cómo empiezo?" | 📖 `tutorials/` te guía paso a paso |
| "Necesito hacer X, ¿cómo?" | 🎯 `how-to/` tiene recetas |
| "¿Cuál es la sintaxis de Y?" | 📚 `reference/` tiene los datos exactos |
| "¿Por qué funciona así?" | 💡 `explanation/` da contexto |

### Para AI Agents

| Necesidad | Solución |
|-----------|----------|
| "¿Qué especificaciones debo seguir?" | 🤖 `agent-docs/specs/` |
| "¿Qué patrones usar?" | 🤖 `agent-docs/research/` |
| "¿Qué problemas conocidos hay?" | 🤖 `agent-docs/research/RESEARCH_STACK_CONTEXT.md` |
| "¿Qué prompts existen?" | 🤖 `agent-docs/prompts/` |

### Para Mantenedores

- ✅ **Estructura clara** - Sabes dónde poner nuevo contenido
- ✅ **Escalable** - Fácil agregar más docs sin confusión
- ✅ **Estándar** - Diátaxis es ampliamente reconocido
- ✅ **Navegable** - GitHub Wiki lista automáticamente

---

## 📈 Métricas de Documentación

### Estado Actual (Diciembre 2025)

| Categoría | Archivos | Estado |
|-----------|----------|--------|
| **Tutorials** | 1 + 4 planeados | 🟡 En desarrollo |
| **How-To** | 2 + 3 planeados | 🟡 En desarrollo |
| **Reference** | 1 + 5 planeados | 🔴 Incompleto |
| **Explanation** | 1 + 4 planeados | 🟡 En desarrollo |
| **Agent Docs** | ~35 | 🟢 Rico en contexto |
| **Wiki** | 1 (Home) | 🔴 Iniciando |

### Próximos Pasos

1. **Migrar contenido existente** a los cuadrantes correctos
2. **Crear tutoriales faltantes** ("Your First Workflow", "Setup Project")
3. **Expandir how-to guides** (AI agents, workflows)
4. **Completar reference** (CLI, configuración, schemas)
5. **Escribir explicaciones** (filosofía, decisiones de arquitectura)
6. **Poblar wiki** con versiones web-friendly

---

## 🔗 Referencias Externas

- **[Diátaxis Framework](https://diataxis.fr/)** - Framework oficial
- **[Write the Docs](https://www.writethedocs.org/)** - Comunidad de documentación técnica
- **[GitHub Wiki Guide](https://docs.github.com/en/communities/documenting-your-project-with-wikis)** - Guía oficial de GitHub

---

## 🎯 Principios de Uso

### Cuándo Crear Documentación

| Situación | Acción |
|-----------|--------|
| Usuario explícitamente pide doc | ✅ Crear en carpeta apropiada |
| Nueva feature necesita tutorial | ✅ Crear en `tutorials/` |
| Problema común recurrente | ✅ Crear en `how-to/` |
| Sintaxis o API nueva | ✅ Actualizar `reference/` |
| Decisión de diseño importante | ✅ Documentar en `explanation/` |
| Tracking de tareas | ❌ **Usar GitHub Issues** |
| Notas temporales | ❌ **Usar issue comments** |
| Planificación | ❌ **Usar issues con label `ai-plan`** |

### Regla de Oro

> **"Si es para trackear progreso, es un Issue. Si es para entender/aprender/resolver, es documentación."**

---

*Estructura basada en [Diátaxis Framework](https://diataxis.fr/) - Systematic documentation authoring*
