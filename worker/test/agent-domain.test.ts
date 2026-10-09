import { describe, expect, it } from 'vitest';
import { createTools, invoke, type RouteFetcher } from '../src/agent/domain.js';
import type { GatewayFacts, Principal } from '../src/agent/contract.js';
import { AgentPolicyError } from '../src/agent/contract.js';
import { assertWorkspace, MUTATING_TOOLS, READ_ONLY_TOOLS } from '../src/agent/policy.js';

/** A principal with budget to spare. */
function principal(over: Partial<Principal> = {}): Principal {
  return {
    id: 'key-abc',
    tier: 'socio',
    workspace: 'priv-a',
    usedToday: 3,
    dailyLimit: 100,
    workspaces: ['priv-a'],
    ...over,
  };
}

const facts: GatewayFacts = {
  freeDailyLimit: 100,
  keyStoreConfigured: true,
  routes: { allRecipes: '/api/all.json', catalog: '/api/by-country/catalog.json' },
};

/**
 * Run `fn`, assert that it threw, and return the error's `reason`.
 *
 * `expect(fn).toThrow()` alone would pass for the wrong error, and a try/catch
 * with the assertion inside the catch passes when nothing throws at all.
 */
function reasonOf(fn: () => unknown): string {
  let reason: string | undefined;
  try {
    fn();
  } catch (error) {
    reason = (error as AgentPolicyError).reason;
  }
  expect(reason, 'expected the call to throw an AgentPolicyError, but it did not throw').toBeDefined();
  return reason as string;
}

/** Synthetic catalogue. Deliberately heterogeneous, because the upstream routes are. */
const CATALOGUE = [
  { id: 'r1', name: 'Tacos al pastor', country: 'MX', description: 'Carne asada', ingredients: ['pita', 'cerdo'] },
  { id: 'r2', name: 'Sushi de salmon', country: 'JP', ingredients: ['arroz', 'salmon'] },
  { id: 'r3', name: 'Ramen tonkotsu', country: 'JP', description: 'caldo de hueso' },
  { id: 'r4', name: 'Tacos deveganos', country: 'MX' },
];

function fetcherReturning(payload: unknown): RouteFetcher {
  return async () => payload;
}

describe('agent domain — tool schemas accept valid input', () => {
  const tools = createTools(fetcherReturning(CATALOGUE));

  it('catalog.search returns hits, a total and a bounded page', async () => {
    const out = await tools['catalog.search']({ limit: 2, offset: 0 }, principal());
    expect(out.hits).toHaveLength(2);
    expect(out.total).toBe(4);
    expect(out.hasMore).toBe(true);
    expect(out.limit).toBe(2);
  });

  it('catalog.search filters by country and by text', async () => {
    const jp = await tools['catalog.search']({ country: 'JP' }, principal());
    expect(jp.hits.map((h) => h.id).sort()).toEqual(['r2', 'r3']);

    const text = await tools['catalog.search']({ q: 'tacos' }, principal());
    expect(text.hits.map((h) => h.id).sort()).toEqual(['r1', 'r4']);
  });

  it('catalog.get returns the record, and null for one that is not there', async () => {
    const found = await tools['catalog.get']({ id: 'r1' }, principal());
    expect(found?.name).toBe('Tacos al pastor');
    expect(found?.ingredients).toEqual(['pita', 'cerdo']);

    const missing = await tools['catalog.get']({ id: 'nope' }, principal());
    expect(missing).toBeNull();
  });

  it('accepts both the array shape and a wrapped one', async () => {
    const wrapped = createTools(fetcherReturning({ recipes: CATALOGUE }));
    const out = await wrapped['catalog.search']({}, principal());
    expect(out.total).toBe(4);

    // A payload of an unexpected shape yields no records rather than invented ones.
    const junk = createTools(fetcherReturning({ surprise: true }));
    expect((await junk['catalog.search']({}, principal())).total).toBe(0);
  });
});

describe('agent domain — malformed input is rejected with a stable reason', () => {
  const tools = createTools(fetcherReturning(CATALOGUE));

  it('rejects a non-positive limit, an oversized limit and a negative offset', async () => {
    for (const input of [{ limit: 0 }, { limit: -1 }, { limit: 5000 }, { offset: -1 }, { offset: 1.5 }]) {
      await expect(tools['catalog.search'](input, principal())).rejects.toMatchObject({
        reason: 'bad-input',
      });
    }
  });

  it('rejects catalog.get without an id', async () => {
    await expect(tools['catalog.get']({ id: '  ' }, principal())).rejects.toMatchObject({
      reason: 'bad-input',
    });
  });

  it('reports the real free-tier limit rather than a remembered one', () => {
    const out = tools['capabilities.get']({ ...facts, freeDailyLimit: 42 }, principal());
    expect(out.rateLimits.freeDailyPerIp).toBe(42);
    expect(out.rateLimits.freeTierNote).toContain('42');
  });
});

describe('agent policy — scope, budget and read-only', () => {
  const tools = createTools(fetcherReturning(CATALOGUE));

  it('refuses a caller with no principal at all', async () => {
    for (const bad of [null, undefined]) {
      await expect(tools['catalog.search']({}, bad)).rejects.toMatchObject({
        reason: 'unauthenticated',
      });
    }
    // capabilities.get is synchronous by design: it answers from facts already in
    // hand, so a refusal is a throw rather than a rejected promise.
    expect(() => tools['capabilities.get'](facts, null)).toThrow(AgentPolicyError);
    try {
      tools['capabilities.get'](facts, null);
    } catch (error) {
      expect((error as AgentPolicyError).reason).toBe('unauthenticated');
    }
  });

  it('cannot read another workspace', async () => {
    // The case that matters: priv-b data must not reach priv-a's agent.
    //
    // The reason is asserted with a helper rather than a bare try/catch. A
    // try/catch whose only expect sits INSIDE the catch passes silently when
    // nothing throws — which is exactly what happened: disabling the isolation
    // check left all 18 tests green. `reasonOf` fails loudly instead.
    const asA = principal({ workspaces: ['priv-a'] });

    // public read is fine
    await expect(tools['catalog.search']({}, asA)).resolves.toBeDefined();

    expect(reasonOf(() => assertWorkspace(asA, 'priv-b'))).toBe('workspace-mismatch');
    // and the message names what was refused
    expect(() => assertWorkspace(asA, 'priv-b')).toThrow(/priv-b/);
    // public data stays readable
    expect(() => assertWorkspace(asA, undefined)).not.toThrow();
  });

  it('enforces the daily budget before doing any work', async () => {
    const spent = principal({ usedToday: 100, dailyLimit: 100 });
    let fetched = false;
    const counting = createTools(async () => {
      fetched = true;
      return CATALOGUE;
    });

    await expect(counting['catalog.search']({}, spent)).rejects.toMatchObject({
      reason: 'limit-exceeded',
    });
    // The important part: the refusal happened BEFORE the fetch, so the
    // exhausted quota was not spent on work it was not allowed to do.
    expect(fetched).toBe(false);
  });

  it('has no mutating tool, and says so', async () => {
    expect(MUTATING_TOOLS).toEqual([]);
    const caps = tools['capabilities.get'](facts, principal());
    expect(caps.readOnly).toBe(true);
    expect(caps.tools.sort()).toEqual([...READ_ONLY_TOOLS].sort());
    expect(caps.tools.some((t) => /create|update|delete|pay|write/i.test(t))).toBe(false);
  });

  it('refuses an unlisted tool by name, and a mutating one as read-only', async () => {
    const tools = createTools(fetcherReturning(CATALOGUE));
    expect(() => invoke(tools, 'catalog.delete', {}, principal())).toThrow(AgentPolicyError);
    try {
      invoke(tools, 'catalog.delete', {}, principal());
    } catch (error) {
      expect((error as AgentPolicyError).reason).toBe('bad-input');
    }
    // capabilities.get itself still works, which is the point of dispatch
    const ok = await invoke(tools, 'catalog.search', { limit: 1 }, principal());
    expect(ok).toMatchObject({ total: 4 });
  });
});
