import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

interface GraphNode {
  id: string
  label: string
  type: string
  [key: string]: unknown
}

interface GraphEdge {
  source: string
  target: string
  type: string
  weight?: number
  [key: string]: unknown
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: {
    total_nodes: number
    total_edges: number
    node_types: string[]
    [key: string]: unknown
  }
}

// Explicit allowlist of closed edge type vocabulary
const ALLOWED_EDGE_TYPES = new Set([
  'USES',
  'BELONGS_TO',
  'HAS_FLAVOR',
  'HAS_TEXTURE',
  'FROM_REGION',
  'PLACE',
  'USES_TECHNIQUE',
  'CONTAINS_VITAMIN',
  'HAS_NUTRIENT',
  'HAS_SUBSTANCE',
  'FOUND_IN',
  'HELPS_CONDITION',
  'TREATS',
  'RELATED_DISHES',
  'OFTEN_TOGETHER',
  'FITS_DIET',
  'SUBSTITUTE_FOR',
])

const SITE_ROOT = path.resolve(__dirname, '../../')
const PUBLIC_GRAPH_PATH = process.env.GRAPH_DATA_PATH
  ? path.resolve(process.env.GRAPH_DATA_PATH)
  : path.join(SITE_ROOT, 'public/graph-data.json')
const GENERATOR_SCRIPT_PATH = path.join(SITE_ROOT, 'scripts/generate-graph.js')

let graphData: GraphData
let nodeMap: Map<string, GraphNode>
let degrees: Map<string, number>

function loadOrGenerateGraph(): GraphData {
  const needsGeneration =
    !fs.existsSync(PUBLIC_GRAPH_PATH) ||
    (fs.existsSync(GENERATOR_SCRIPT_PATH) &&
      fs.statSync(PUBLIC_GRAPH_PATH).mtimeMs <
        fs.statSync(GENERATOR_SCRIPT_PATH).mtimeMs)

  if (needsGeneration) {
    try {
      execSync('node scripts/generate-graph.js', {
        cwd: SITE_ROOT,
        stdio: 'pipe',
        timeout: 120_000,
      })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Failed to generate knowledge graph before running integrity tests: ${errorMsg}`,
      )
    }
  }

  const raw = fs.readFileSync(PUBLIC_GRAPH_PATH, 'utf8')
  return JSON.parse(raw) as GraphData
}

beforeAll(() => {
  graphData = loadOrGenerateGraph()
  nodeMap = new Map<string, GraphNode>()
  degrees = new Map<string, number>()

  for (const n of graphData.nodes) {
    nodeMap.set(n.id, n)
    degrees.set(n.id, 0)
  }

  for (const e of graphData.edges) {
    if (degrees.has(e.source)) {
      degrees.set(e.source, (degrees.get(e.source) || 0) + 1)
    }
    if (degrees.has(e.target)) {
      degrees.set(e.target, (degrees.get(e.target) || 0) + 1)
    }
  }
}, 120_000) // fix: fresh-checkout graph generation exceeds vitest's 10s default hookTimeout

describe('Knowledge Graph Integrity Suite', () => {
  it('artifact parses and metadata counts match nodes and edges arrays', () => {
    expect(graphData).toBeDefined()
    expect(Array.isArray(graphData.nodes)).toBe(true)
    expect(Array.isArray(graphData.edges)).toBe(true)
    expect(graphData.metadata).toBeDefined()

    const nodeMismatch =
      graphData.nodes.length !== graphData.metadata.total_nodes
        ? `Node count mismatch: nodes array length (${graphData.nodes.length}) !== metadata.total_nodes (${graphData.metadata.total_nodes})`
        : null
    const edgeMismatch =
      graphData.edges.length !== graphData.metadata.total_edges
        ? `Edge count mismatch: edges array length (${graphData.edges.length}) !== metadata.total_edges (${graphData.metadata.total_edges})`
        : null

    expect(nodeMismatch).toBeNull()
    expect(edgeMismatch).toBeNull()
  })

  it('contains zero orphan references (every edge source and target exists in nodes)', () => {
    const orphanEdges: {
      index: number
      source: string
      target: string
      type: string
    }[] = []

    for (let i = 0; i < graphData.edges.length; i++) {
      const e = graphData.edges[i]
      if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) {
        orphanEdges.push({
          index: i,
          source: e.source,
          target: e.target,
          type: e.type,
        })
      }
    }

    if (orphanEdges.length > 0) {
      const examples = orphanEdges
        .slice(0, 5)
        .map(
          (e) =>
            `  - Edge #${e.index} (${e.type}): source="${e.source}" (exists: ${nodeMap.has(
              e.source,
            )}), target="${e.target}" (exists: ${nodeMap.has(e.target)})`,
        )
        .join('\n')
      expect.fail(
        `[INVARIANT VIOLATION] Orphan References: Found ${orphanEdges.length} edge(s) referencing non-existent nodes.\nExamples:\n${examples}`,
      )
    }
  })

  it('contains zero self-loops (source !== target)', () => {
    const selfLoops: { index: number; node: string; type: string }[] = []

    for (let i = 0; i < graphData.edges.length; i++) {
      const e = graphData.edges[i]
      if (e.source === e.target) {
        selfLoops.push({ index: i, node: e.source, type: e.type })
      }
    }

    if (selfLoops.length > 0) {
      const examples = selfLoops
        .slice(0, 5)
        .map((e) => `  - Edge #${e.index} (${e.type}): node="${e.node}"`)
        .join('\n')
      expect.fail(
        `[INVARIANT VIOLATION] Self-Loops: Found ${selfLoops.length} edge(s) where source === target.\nExamples:\n${examples}`,
      )
    }
  })

  it('uses a closed edge vocabulary matching the explicit allowlist', () => {
    const forbiddenTypes = new Map<string, number>()

    for (const e of graphData.edges) {
      if (!ALLOWED_EDGE_TYPES.has(e.type)) {
        forbiddenTypes.set(e.type, (forbiddenTypes.get(e.type) || 0) + 1)
      }
    }

    if (forbiddenTypes.size > 0) {
      const examples = Array.from(forbiddenTypes.entries())
        .map(([t, count]) => `  - Edge type "${t}": ${count} occurrence(s)`)
        .join('\n')
      expect.fail(
        `[INVARIANT VIOLATION] Closed Edge Vocabulary: Found ${forbiddenTypes.size} unallowed edge type(s).\n` +
          `If this is a deliberate addition, add the new edge type to ALLOWED_EDGE_TYPES in site/src/lib/graph-integrity.test.ts and document it in docs/GRAPH_INVARIANTS.md.\n` +
          `Offending edge types:\n${examples}`,
      )
    }
  })

  it('contains no placeholder ids (/^[a-z]+_+$/ or containing "unknown")', () => {
    const placeholderNodes: { id: string; reason: string }[] = []

    for (const n of graphData.nodes) {
      if (/^[a-z]+_+$/.test(n.id)) {
        placeholderNodes.push({
          id: n.id,
          reason: 'Matches trailing underscore pattern /^[a-z]+_+$/',
        })
      } else if (n.id.toLowerCase().includes('unknown')) {
        placeholderNodes.push({
          id: n.id,
          reason: 'Contains forbidden "unknown" substring',
        })
      }
    }

    if (placeholderNodes.length > 0) {
      const examples = placeholderNodes
        .slice(0, 5)
        .map((p) => `  - Node id="${p.id}": ${p.reason}`)
        .join('\n')
      expect.fail(
        `[INVARIANT VIOLATION] Placeholder IDs: Found ${placeholderNodes.length} node(s) with placeholder IDs.\nExamples:\n${examples}`,
      )
    }
  })

  it('enforces id format convention (^[a-z]+_[a-z0-9_]+$) and prefix matching node type', () => {
    const invalidIds: { id: string; type: string; reason: string }[] = []

    for (const n of graphData.nodes) {
      if (!/^[a-z]+_[a-z0-9_]+$/.test(n.id)) {
        invalidIds.push({
          id: n.id,
          type: n.type,
          reason: 'Does not match regex ^[a-z]+_[a-z0-9_]+$',
        })
      } else {
        const prefix = n.id.split('_')[0]
        if (prefix !== n.type) {
          invalidIds.push({
            id: n.id,
            type: n.type,
            reason: `ID prefix "${prefix}" does not match node.type "${n.type}"`,
          })
        }
      }
    }

    if (invalidIds.length > 0) {
      const examples = invalidIds
        .slice(0, 5)
        .map((i) => `  - Node id="${i.id}" (type="${i.type}"): ${i.reason}`)
        .join('\n')
      expect.fail(
        `[INVARIANT VIOLATION] ID Conventions: Found ${invalidIds.length} node(s) violating ID naming or prefix conventions.\nExamples:\n${examples}`,
      )
    }
  })

  it('structural minimums: every individual recipe node (excluding list aggregators) has >= 1 USES edge', () => {
    // List aggregators (e.g. recetas_amazonia.md) collect recipes and do not have ingredient lists
    const recipeNodes = graphData.nodes.filter(
      (n) => n.type === 'recipe' && !String(n.slug ?? '').includes('recetas_'),
    )
    const recipeUsesCount = new Map<string, number>()

    for (const r of recipeNodes) {
      recipeUsesCount.set(r.id, 0)
    }

    for (const e of graphData.edges) {
      if (e.type === 'USES' && recipeUsesCount.has(e.source)) {
        recipeUsesCount.set(e.source, (recipeUsesCount.get(e.source) || 0) + 1)
      }
    }

    const recipesNoUses = Array.from(recipeUsesCount.entries())
      .filter(([, count]) => count === 0)
      .map(([id]) => id)

    if (recipesNoUses.length > 0) {
      const examples = recipesNoUses
        .slice(0, 5)
        .map((id) => `  - Recipe node id="${id}" has 0 USES edges`)
        .join('\n')
      expect.fail(
        `[INVARIANT VIOLATION] Recipe USES Minimums: Found ${recipesNoUses.length} recipe node(s) without any USES edge.\nExamples:\n${examples}`,
      )
    }
  })

  it('structural minimums: every diet/region/category/place/technique node has degree >= 1 (excluding diet until wave C.02/C.03)', () => {
    // Note: diet nodes are tested in the skipped wave contract block below until Wave C.02/C.03 land
    const checkedTypes = new Set(['region', 'category', 'place', 'technique'])
    const isolatedNodes: { id: string; type: string }[] = []

    for (const n of graphData.nodes) {
      if (checkedTypes.has(n.type) && (degrees.get(n.id) || 0) === 0) {
        isolatedNodes.push({ id: n.id, type: n.type })
      }
    }

    if (isolatedNodes.length > 0) {
      const examples = isolatedNodes
        .slice(0, 5)
        .map((n) => `  - Node id="${n.id}" (type="${n.type}") has degree 0`)
        .join('\n')
      expect.fail(
        `[INVARIANT VIOLATION] Structural Minimums: Found ${isolatedNodes.length} region/category/place/technique node(s) with degree 0.\nExamples:\n${examples}`,
      )
    }
  })

  // TODO(#299): Activate this describe block after Wave C.02 and Wave C.03 PRs (#299) merge.
  // This asserts the full wave contract including diet edges, replacement edges, vitamin counts, and complete zero-isolated-nodes guarantee.
  describe.skip('Wave C Contract Assertions (Pending #299 merge)', () => {
    it('every diet node has >= 1 FITS_DIET edge', () => {
      const dietNodes = graphData.nodes.filter((n) => n.type === 'diet')
      const fitsDietEdges = graphData.edges.filter(
        (e) => e.type === 'FITS_DIET',
      )
      const connectedDiets = new Set<string>()

      for (const e of fitsDietEdges) {
        if (nodeMap.get(e.source)?.type === 'diet') connectedDiets.add(e.source)
        if (nodeMap.get(e.target)?.type === 'diet') connectedDiets.add(e.target)
      }

      const unconnectedDiets = dietNodes.filter(
        (d) => !connectedDiets.has(d.id),
      )
      expect(
        unconnectedDiets.length,
        `Diets with 0 FITS_DIET edges: ${unconnectedDiets.map((d) => d.id).join(', ')}`,
      ).toBe(0)
    })

    it('SUBSTITUTE_FOR edge count >= 20', () => {
      const substituteCount = graphData.edges.filter(
        (e) => e.type === 'SUBSTITUTE_FOR',
      ).length
      expect(substituteCount).toBeGreaterThanOrEqual(20)
    })

    it('CONTAINS_VITAMIN edge count >= 105', () => {
      const vitaminCount = graphData.edges.filter(
        (e) => e.type === 'CONTAINS_VITAMIN',
      ).length
      expect(vitaminCount).toBeGreaterThanOrEqual(105)
    })

    it('contains 0 isolated nodes across all node types (every node degree >= 1)', () => {
      const isolated = Array.from(degrees.entries())
        .filter(([, deg]) => deg === 0)
        .map(([id]) => id)

      if (isolated.length > 0) {
        const examples = isolated
          .slice(0, 5)
          .map((id) => `  - Node id="${id}" (type="${nodeMap.get(id)?.type}")`)
          .join('\n')
        expect.fail(
          `[INVARIANT VIOLATION] Zero Isolated Nodes: Found ${isolated.length} isolated node(s) with degree 0.\nExamples:\n${examples}`,
        )
      }
    })
  })
})
