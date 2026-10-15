/**
 * Tool schemas for the agent surface.
 *
 * # What this is, and what it deliberately is not
 *
 * Three READ-ONLY tools over the Gastronomic Open Standard dataset. A pilot: it
 * lets an agent discover what the platform can do and read public catalogue data,
 * and nothing else. There is no mutating tool here, and adding one is a decision
 * the owner has to make explicitly rather than a refactor.
 *
 * Since 2026-10-15 GOS sells nothing: the gateway reads no credential at all, so
 * the `Principal` below carries only budget and workspace scope, never a tier.
 *
 * # Why `catalog.search` is a contract over HTTP and not a database query
 *
 * The worker itself holds no catalogue. It is a gateway: the data lives at the
 * routes declared in its own root response (`OPEN_ROUTES` in `src/index.ts`). So
 * the search tool fetches those routes rather than inventing a second data path,
 * and every failure mode here is a fetch failure or a shape mismatch.
 *
 * `capabilities.get` reports what the worker actually
 * enforces today, including the parts that are configuration rather than code.
 */

/** Raised when a call is refused. `reason` is stable; `message` is for humans. */
export class AgentPolicyError extends Error {
  readonly reason:
    | 'unauthenticated'
    | 'workspace-mismatch'
    | 'read-only'
    | 'limit-exceeded'
    | 'bad-input'

  constructor(reason: AgentPolicyError['reason'], message: string) {
    super(message)
    this.name = 'AgentPolicyError'
    this.reason = reason
  }
}

/** Why a call was refused, in the caller's own words. */
export type Principal = {
  /** Stable identity of the caller, as its embedding app resolved it. */
  id: string
  /** Private workspace this principal may read. Empty means public data only. */
  workspace: string
  /** Requests this principal has made today, as the gateway counts them. */
  usedToday: number
  /** Daily ceiling for this principal. */
  dailyLimit: number
  /** Every workspace this principal may read. */
  workspaces: readonly string[]
}

/**
 * What the gateway reports back to `capabilities.get`.
 *
 * Read from `src/index.ts` rather than restated, so a change in the gateway's
 * routes or its anonymous rate-limit wiring shows up here rather than in a stale
 * duplicate.
 */
export interface GatewayFacts {
  freeDailyLimit: number
  routes: Record<string, string>
}

/** A search over the public recipe catalogue. */
export interface CatalogSearchInput {
  /** Free-text query matched against recipe names and descriptions. */
  q?: string
  /** ISO country code to restrict to, e.g. `MX`. */
  country?: string
  /** Maximum records to return. Hard-capped by `MAX_PAGE_SIZE`. */
  limit?: number
  /** Zero-based offset for pagination. */
  offset?: number
}

export interface CatalogSearchHit {
  id: string
  name: string
  country?: string
  url?: string
}

export interface CatalogSearchOutput {
  hits: CatalogSearchHit[]
  total: number
  offset: number
  limit: number
  /** True when the source route returned more than this page. */
  hasMore: boolean
}

export interface CatalogGetInput {
  /** Recipe identifier from a `catalog.search` result. */
  id: string
}

export interface CatalogGetOutput {
  id: string
  name: string
  country?: string
  /** Present only when the upstream record carries it. */
  description?: string
  ingredients?: string[]
  steps?: string[]
  url?: string
}

export interface CapabilitiesOutput {
  /** The three tools this pilot exposes. */
  tools: string[]
  /** Whether the pilot permits writes. Always false; stated so it can be asserted. */
  readOnly: true
  authentication: {
    /** No header carries a credential: the API is open. */
    header: 'none'
    /** How a caller is identified. Empty when nothing is required. */
    modes: string[]
  }
  rateLimits: {
    /** Requests per day per IP, from the worker's own env read. */
    dailyPerIp: number
    note: string
  }
  /** True when the worker is serving real catalogue data rather than a stub. */
  catalogAvailable: boolean
  /** Claims this record does NOT make. */
  notProvided: string[]
  /** Anything still waiting on the owner, stated rather than guessed. */
  status: Record<string, 'available' | 'awaiting-founder'>
}

/**
 * Largest page a caller may request.
 *
 * The gateway allows 100 anonymous requests a day per IP, so a single call that
 * could page through everything would make that limit meaningless.
 */
export const MAX_PAGE_SIZE = 50

/** Default page when the caller does not ask for one. */
export const DEFAULT_PAGE_SIZE = 10
