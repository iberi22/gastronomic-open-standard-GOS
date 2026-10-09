/**
 * Policy for the read-only agent pilot.
 *
 * # The rules, and why each exists
 *
 * 1. **Authentication is injected, never read from a global.** The gateway resolves
 *    the principal from `x-api-key` against the key store and passes it in. A tool
 *    that read the key itself would be a second, divergent auth path — and the
 *    gateway's own history shows why that is dangerous: `src/index.ts` L166-178
 *    documents a fail-open catch that granted access to any key whose body merely
 *    contained the word "socio". One path, fail-closed, is the property worth
 *    keeping.
 *
 * 2. **Workspace isolation is checked on every call, not once per session.** Cheap,
 *    and it survives a bug that hands a tool the wrong principal.
 *
 * 3. **There is no mutating path at all.** Not "disabled by default" — absent.
 *    `MUTATING_TOOLS` is empty and the tests assert it stays empty, so adding one
 *    is a visible change rather than a silent one.
 *
 * 4. **Budgets are enforced before the work, not after.** A caller that has spent
 *    its daily allowance does not reach the catalogue, because that fetch is the
 *    expensive part.
 *
 * 5. **Nothing here trusts its own input.** Every limit is checked against a
 *    declared maximum rather than assumed, because these tools are reachable by an
 *    agent that will try a very large number first.
 */

import {
  AgentPolicyError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type Principal,
} from './contract.js'

/**
 * Tools that change state. Deliberately empty.
 *
 * The pilot is read-only, so this list is empty rather than containing tools with
 * a `disabled` flag: an empty list cannot be misconfigured, and the tests assert
 * it stays empty.
 */
export const MUTATING_TOOLS: readonly string[] = []

/** The three tools this pilot exposes. */
export const READ_ONLY_TOOLS = [
  'catalog.search',
  'catalog.get',
  'capabilities.get',
] as const

/**
 * Establish the principal for a call.
 *
 * Takes it as an argument on purpose. Reading it from a module global would let a
 * tool be called outside a request context and either throw on `undefined` or,
 * worse, fall back to something permissive.
 */
export function requirePrincipal(
  principal: Principal | null | undefined,
): Principal {
  if (!principal) {
    throw new AgentPolicyError(
      'unauthenticated',
      'no principal: the agent surface is never reachable without one',
    )
  }
  if (!principal.id) {
    throw new AgentPolicyError(
      'unauthenticated',
      'the principal has no id, which means the key store did not resolve it',
    )
  }
  return principal
}

/**
 * True when the principal may read `workspace`.
 *
 * An empty requested workspace means public data, which everyone may read. A
 * non-empty one must be named on the principal. This is the check that keeps one
 * tenant's private records out of another's answers.
 */
export function mayReadWorkspace(
  principal: Principal,
  workspace: string | undefined,
): boolean {
  if (!workspace) return true // public data
  return principal.workspaces.includes(workspace)
}

export function assertWorkspace(
  principal: Principal,
  workspace: string | undefined,
): void {
  if (!mayReadWorkspace(principal, workspace)) {
    throw new AgentPolicyError(
      'workspace-mismatch',
      `principal ${principal.id} may not read workspace ${workspace}`,
    )
  }
}

/**
 * Enforce the daily budget.
 *
 * Checked before any catalogue work: the fetch is the expensive part, and a
 * refused call that had already fetched would still have spent the quota it was
 * trying to exceed.
 */
export function assertBudget(principal: Principal, calls = 1): void {
  if (principal.usedToday + calls > principal.dailyLimit) {
    throw new AgentPolicyError(
      'limit-exceeded',
      `principal ${principal.id} used ${principal.usedToday} of ` +
        `${principal.dailyLimit} requests today`,
    )
  }
}

/** Clamp a requested page to something the gateway can serve. */
export function normalisePage(input: { limit?: number; offset?: number }): {
  limit: number
  offset: number
} {
  const requested = input.limit ?? DEFAULT_PAGE_SIZE
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new AgentPolicyError(
      'bad-input',
      `limit must be a positive number, got ${String(input.limit)}`,
    )
  }
  if (requested > MAX_PAGE_SIZE) {
    throw new AgentPolicyError(
      'bad-input',
      `limit ${requested} exceeds the maximum page of ${MAX_PAGE_SIZE}`,
    )
  }
  const offset = input.offset ?? 0
  if (!Number.isInteger(offset) || offset < 0) {
    throw new AgentPolicyError(
      'bad-input',
      `offset must be a non-negative integer, got ${String(input.offset)}`,
    )
  }
  return { limit: requested, offset }
}

/**
 * Refuse any attempt to invoke a tool that does not exist.
 *
 * Without this, a caller asking for an unlisted tool gets `undefined is not a
 * function`, which reads like a bug rather than a refusal. An agent will try
 * `catalog.delete`, and the answer should say no rather than crash.
 */
export function assertKnownTool(name: string): void {
  if (!READ_ONLY_TOOLS.includes(name as (typeof READ_ONLY_TOOLS)[number])) {
    throw new AgentPolicyError(
      MUTATING_TOOLS.includes(name) ? 'read-only' : 'bad-input',
      MUTATING_TOOLS.includes(name)
        ? `${name} changes state and this pilot is read-only`
        : `${name} is not one of the pilot's tools: ${READ_ONLY_TOOLS.join(', ')}`,
    )
  }
}

/**
 * The full check a tool call goes through, in order.
 *
 * Order matters: authenticate, then scope, then budget, then shape. Refusing an
 * unauthenticated caller before validating their input avoids telling a stranger
 * what a valid request looks like.
 */
export function authorise(
  principal: Principal | null | undefined,
  options: { workspace?: string; calls?: number } = {},
): Principal {
  const p = requirePrincipal(principal)
  assertWorkspace(p, options.workspace)
  assertBudget(p, options.calls ?? 1)
  return p
}
