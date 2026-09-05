import { beforeEach, describe, expect, it } from 'vitest'
import {
  agentCreate,
  agentDelete,
  agentGet,
  agentList,
  agentSearch,
} from './agentDomain'
import { type EntityName, getMemoryAdapter, setStorageAdapter } from './domain'

describe('agentDomain 100% agentico', () => {
  beforeEach(() => {
    getMemoryAdapter().clear()
    setStorageAdapter(getMemoryAdapter())
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('agentCreate crea fila + memoria + mesh', async () => {
    const rec = await agentCreate('recipe', { name: 'AgentItem' }, 'inst1')
    expect(rec.id).toBeTruthy()
    expect(rec.instance_id).toBe('inst1')
    // lista filtra por instance
    const list = await agentList('recipe', 'inst1')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(rec.id)
    // isolation
    expect(await agentList('recipe', 'inst2')).toHaveLength(0)
  })

  it('agentSearch combina memoria + records', async () => {
    await agentCreate('recipe', { name: 'BuscarZapato' }, 'inst1')
    const res = await agentSearch('recipe', 'zapato', 'inst1')
    expect(res.records.length).toBeGreaterThan(0)
    // memories puede estar vacio si Xavier offline, pero no falla
    expect(Array.isArray(res.memories)).toBe(true)
  })

  it('agentDelete borra y genera memoria delete', async () => {
    const rec = await agentCreate('recipe', { name: 'Borrar' }, 'inst1')
    expect(await agentDelete('recipe', rec.id, 'inst1')).toBe(true)
    expect(await agentGet('recipe', rec.id, 'inst1')).toBeNull()
  })

  it('rechaza entity no whitelisteada (100% agentico no inventa tablas)', async () => {
    await expect(
      agentCreate('evil' as unknown as EntityName, {}),
    ).rejects.toThrow()
  })
})
