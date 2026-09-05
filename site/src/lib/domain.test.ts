import { beforeEach, describe, expect, it } from 'vitest'
import {
  createEntity,
  deleteEntity,
  type EntityName,
  getEntity,
  getMemoryAdapter,
  listEntities,
  setStorageAdapter,
  surrealDefineTable,
  updateEntity,
} from './domain'

describe('domain CRUD + instance isolation', () => {
  beforeEach(() => {
    getMemoryAdapter().clear()
    setStorageAdapter(getMemoryAdapter())
  })

  it('create + list filtra por instance_id', async () => {
    const a = await createEntity('recipe', { name: 'A' }, 'inst1')
    await createEntity('recipe', { name: 'B' }, 'inst2')
    expect(a.instance_id).toBe('inst1')
    const l1 = await listEntities('recipe', 'inst1')
    const l2 = await listEntities('recipe', 'inst2')
    expect(l1).toHaveLength(1)
    expect(l2).toHaveLength(1)
    expect(l1[0].id).toBe(a.id)
  })

  it('get respeta instance_id', async () => {
    const r = await createEntity('ingredient', { itemId: 'x' }, 'inst1')
    expect(await getEntity('ingredient', r.id, 'inst1')).not.toBeNull()
    expect(await getEntity('ingredient', r.id, 'inst2')).toBeNull()
  })

  it('update + delete', async () => {
    const r = await createEntity('recipe', { name: 'old' }, 'inst1')
    const upd = await updateEntity('recipe', r.id, { name: 'new' }, 'inst1')
    expect(upd?.name).toBe('new')
    expect(await deleteEntity('recipe', r.id, 'inst1')).toBe(true)
    expect(await getEntity('recipe', r.id, 'inst1')).toBeNull()
  })

  it('rechaza entity no whitelisteada', async () => {
    await expect(
      createEntity('evil' as unknown as EntityName, {}),
    ).rejects.toThrow(/no whitelisteada/)
  })

  it('surrealDefineTable genera DDL con instance_id index', () => {
    const ddl = surrealDefineTable('recipe')
    expect(ddl).toContain('DEFINE TABLE recipe')
    expect(ddl).toContain('instance_id')
    expect(ddl).toContain('DEFINE INDEX recipe_instance_idx')
  })

  it('default instance_id usa domain.config', async () => {
    const r = await createEntity('recipe', { name: 'def' })
    expect(r.instance_id).toBe('default')
  })
})
