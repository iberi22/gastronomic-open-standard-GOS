// site/src/lib/offline-seed.ts — populate IndexedDB from static JSON on PWA load
// Runs once per page load in browser context. Falls back silently if offline.

import { IndexedDBStorageAdapter } from './indexeddb';

const ENTITIES = ['recipes', 'ingredients', 'vitamins', 'conditions', 'diets'] as const;

export async function seedFromStaticBuild(baseUrl = ''): Promise<{ seeded: number; skipped: string[] }> {
  if (typeof indexedDB === 'undefined') {
    return { seeded: 0, skipped: ['SSR environment'] };
  }

  const adapter = new IndexedDBStorageAdapter();
  let seeded = 0;
  const skipped: string[] = [];

  for (const entity of ENTITIES) {
    try {
      const res = await fetch(`${baseUrl}/api/${entity}.json`, { cache: 'force-cache' });
      if (!res.ok) {
        skipped.push(`${entity}: HTTP ${res.status}`);
        continue;
      }
      const records = (await res.json()) as Array<{ id: string; instance_id?: string }>;
      if (!Array.isArray(records) || records.length === 0) {
        skipped.push(`${entity}: empty or invalid JSON`);
        continue;
      }
      for (const record of records) {
        const withMeta = {
          ...record,
          instance_id: record.instance_id || 'seed-default',
          updated_at: new Date().toISOString(),
          created_at: (record as any).created_at || new Date().toISOString(),
        };
        await adapter.create(entity.slice(0, -1), withMeta as any);
        seeded++;
      }
    } catch (err) {
      skipped.push(`${entity}: ${String(err)}`);
    }
  }

  return { seeded, skipped };
}

export async function isSeeded(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    const adapter = new IndexedDBStorageAdapter();
    const records = await adapter.list('ingredient', 'seed-default');
    return records.length > 0;
  } catch {
    return false;
  }
}