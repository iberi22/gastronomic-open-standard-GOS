import { describe, expect, it } from 'vitest';
import type { Principal } from '../src/agent/contract.js';
import { AgentPolicyError } from '../src/agent/contract.js';

/**
 * Run `fn`, assert it threw, and return the error's `reason`.
 *
 * A try/catch whose only assertion sits inside the catch passes silently when
 * nothing throws — which is how the workspace-isolation check came to have no
 * teeth at all while all 18 tests stayed green.
 */
function reasonOf(fn: () => unknown): string {
  let reason: string | undefined;
  try {
    fn();
  } catch (error) {
    reason = (error as AgentPolicyError).reason;
  }
  expect(reason, 'expected the call to throw, but it did not').toBeDefined();
  return reason as string;
}
import {
  assertBudget,
  assertKnownTool,
  assertWorkspace,
  authorise,
  mayReadWorkspace,
  MUTATING_TOOLS,
  normalisePage,
  READ_ONLY_TOOLS,
  requirePrincipal,
} from '../src/agent/policy.js';

function principal(over: Partial<Principal> = {}): Principal {
  return {
    id: 'key-abc',
    tier: 'socio',
    workspace: 'priv-a',
    usedToday: 0,
    dailyLimit: 100,
    workspaces: ['priv-a', 'priv-b'],
    ...over,
  };
}

describe('agent policy — the six rules, each with its refusal', () => {
  it('1. authentication is a parameter, not a global', () => {
    // No module-level principal exists to fall back on: `requirePrincipal`
    // takes it as an argument precisely so there is nothing to reach for.
    expect(() => requirePrincipal(null)).toThrow(/no principal/);
    expect(() => requirePrincipal(undefined)).toThrow(/no principal/);
    // A principal without an id means the key store did not resolve it, which is
    // a different failure and gets a different reason.
    expect(reasonOf(() => requirePrincipal(principal({ id: '' })))).toBe('unauthenticated');
  });

  it('2. workspace isolation, and public data stays readable', () => {
    const p = principal({ workspaces: ['priv-a'] });
    expect(mayReadWorkspace(p, 'priv-a')).toBe(true);
    expect(mayReadWorkspace(p, 'priv-b')).toBe(false);
    // No workspace means public data, which everyone may read.
    expect(mayReadWorkspace(p, undefined)).toBe(true);
    expect(mayReadWorkspace(p, '')).toBe(true);
    expect(() => assertWorkspace(p, 'priv-b')).toThrow(/priv-b/);
  });

  it('3. there is no mutating tool, not even a disabled one', () => {
    expect(MUTATING_TOOLS).toEqual([]);
    expect(READ_ONLY_TOOLS).toHaveLength(3);
    // Naming a plausible write tool gets refused, and the refusal says why.
    expect(['read-only', 'bad-input']).toContain(reasonOf(() => assertKnownTool('catalog.delete')));
    expect(() => assertKnownTool('catalog.delete')).toThrow(/catalog\.search/);
  });

  it('4. the budget is checked before the work, and exact', () => {
    const atLimit = principal({ usedToday: 100, dailyLimit: 100 });
    expect(() => assertBudget(atLimit)).toThrow(/100 of 100/);
    // One short of the limit still passes.
    expect(() => assertBudget(principal({ usedToday: 99, dailyLimit: 100 }))).not.toThrow();
    // A multi-call reservation is accounted in full.
    // `reason` is a stable field; the message is prose for a human. Assert the
    // field, not the message -- a reworded message must not break the gate.
    expect(reasonOf(() => assertBudget(principal({ usedToday: 98, dailyLimit: 100 }), 5)))
      .toBe('limit-exceeded');
    expect(() => assertBudget(principal({ usedToday: 98, dailyLimit: 100 }), 5))
      .toThrow(/98 of 100/);
  });

  it('5. page limits are clamped, not trusted', () => {
    expect(normalisePage({})).toEqual({ limit: 10, offset: 0 });
    expect(normalisePage({ limit: 25, offset: 50 })).toEqual({ limit: 25, offset: 50 });
    // The free tier allows 100 requests a day; a 10,000-record page would make
    // that limit meaningless, so it is refused rather than served.
    for (const bad of [{ limit: 0 }, { limit: -5 }, { limit: 10_000 }, { offset: -1 }, { offset: 2.5 }]) {
      expect(() => normalisePage(bad)).toThrow();
    }
  });

  it('6. the full check runs in order: authenticate, scope, then budget', () => {
    // A stranger with an exhausted budget is told they are unauthenticated,
    // not that their quota is spent — validating input before authenticating
    // tells a stranger what a valid request looks like.
    const stranger = null;
    expect(() => authorise(stranger, { workspace: 'priv-b', calls: 1 })).toThrow(/no principal/);

    // A known principal asking for a workspace they cannot read is refused on
    // scope, not on budget.
    const p = principal({ workspaces: ['priv-a'], usedToday: 100, dailyLimit: 100 });
    expect(() => authorise(p, { workspace: 'priv-b' })).toThrow(/priv-b/);

    // A permitted principal passes through and comes back unchanged.
    const ok = authorise(principal(), { workspace: 'priv-a', calls: 1 });
    expect(ok.id).toBe('key-abc');
  });
});
