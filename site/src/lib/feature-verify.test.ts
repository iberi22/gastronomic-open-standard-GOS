import { existsSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Pruebas unitarias de la lógica del verificador de features (GitCore feature-verify).
 *
 * Cubre sin depender de pwsh:
 * 1. Normalización de separadores (/ y \) sobre rutas relativas anidadas.
 * 2. Que un archivo existente NUNCA se reporte como MISS en el informe .md.
 * 3. Que un archivo ausente SI se reporte como MISS.
 * 4. Que archivos más allá del cap de 6 archivos se marquen como UNANALYZED y nunca como MISS.
 */

interface EvidenceRecord {
  rel: string
  abs: string | null
  exists: boolean
  kind: 'file' | 'directory' | 'glob' | 'missing' | 'unanalyzed'
  totalLines: number
  readFailed?: boolean
  empty?: boolean
}

function normalizeEvidencePath(
  projectRoot: string,
  relPath: string,
): { abs: string | null; exists: boolean } {
  const normalized = relPath.replace(/[\\/]/g, sep).replace(/^\.[\\/]/, '')
  const full = resolve(projectRoot, normalized)
  if (existsSync(full)) {
    return { abs: full, exists: true }
  }
  return { abs: null, exists: false }
}

function formatMarkdownEvidenceLine(root: string, r: EvidenceRecord): string {
  if (r.exists) {
    const tag = r.kind === 'file' ? 'CODE' : r.kind.toUpperCase()
    let out = `- OK  [${tag}] ${r.rel}  lines=${r.totalLines}  excerpt=1-${Math.min(r.totalLines, 40)}\n`
    out += `      abs=${r.abs}`
    if (r.abs) {
      const readRel = relative(root, r.abs).replace(/\\/g, '/')
      if (readRel && readRel !== r.rel.replace(/\\/g, '/')) {
        out += `\n      rel=${readRel}`
      }
    }
    return out
  }
  if (r.empty) {
    return `- EMPTY_DIR ${r.rel} (zero credit)`
  }
  if (r.kind === 'unanalyzed') {
    return `- UNANALYZED ${r.rel} (beyond analysis cap, exists, zero credit)`
  }
  return `- MISS ${r.rel} (not found under project root)`
}

describe('GitCore feature-verify logic & markdown reporting', () => {
  const root = resolve(__dirname, '../../..')

  it('normaliza rutas relativas anidadas con / y \\ reconociendo archivos existentes', () => {
    const existingSlash = 'site/src/lib/domain.ts'
    const existingBackslash = 'site\\src\\lib\\domain.ts'
    const absentPath = 'site/src/lib/absent-file-xyz.ts'

    const resSlash = normalizeEvidencePath(root, existingSlash)
    const resBackslash = normalizeEvidencePath(root, existingBackslash)
    const resAbsent = normalizeEvidencePath(root, absentPath)

    expect(resSlash.exists).toBe(true)
    expect(resSlash.abs).not.toBeNull()
    expect(resBackslash.exists).toBe(true)
    expect(resBackslash.abs).toBe(resSlash.abs)

    expect(resAbsent.exists).toBe(false)
    expect(resAbsent.abs).toBeNull()
  })

  it('el informe .md marca OK en archivos existentes y MISS en ausentes (nunca MISS en existentes)', () => {
    const existingRec: EvidenceRecord = {
      rel: 'site/src/lib/domain.ts',
      abs: resolve(root, 'site/src/lib/domain.ts'),
      exists: true,
      kind: 'file',
      totalLines: 50,
    }

    const absentRec: EvidenceRecord = {
      rel: 'site/src/lib/absent-file-xyz.ts',
      abs: null,
      exists: false,
      kind: 'missing',
      totalLines: 0,
    }

    const existingLine = formatMarkdownEvidenceLine(root, existingRec)
    const absentLine = formatMarkdownEvidenceLine(root, absentRec)

    // Archivo existente
    expect(existingLine).toContain('- OK  [CODE] site/src/lib/domain.ts')
    expect(existingLine).not.toContain('- MISS site/src/lib/domain.ts')

    // Archivo ausente
    expect(absentLine).toContain(
      '- MISS site/src/lib/absent-file-xyz.ts (not found under project root)',
    )
  })

  it('el informe .md marca UNANALYZED en archivos más allá del cap de 6 archivos y nunca MISS', () => {
    const unanalyzedRec: EvidenceRecord = {
      rel: 'site/src/lib/extra-file.ts',
      abs: resolve(root, 'site/src/lib/extra-file.ts'),
      exists: false, // exists: false para no sumar créditos de cobertura
      kind: 'unanalyzed',
      totalLines: 0,
    }

    const line = formatMarkdownEvidenceLine(root, unanalyzedRec)

    expect(line).toContain(
      '- UNANALYZED site/src/lib/extra-file.ts (beyond analysis cap, exists, zero credit)',
    )
    expect(line).not.toContain('- MISS site/src/lib/extra-file.ts')
  })
})
