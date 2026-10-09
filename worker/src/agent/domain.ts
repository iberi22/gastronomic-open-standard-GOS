/**
 * The three read-only tools.
 *
 * Every fetch goes through an injected `fetchRoutes`, so a test can drive all of
 * this without a network and without inventing a data path. The default reads the
 * catalogue from the routes the gateway already declares in its own root response
 * (`src/index.ts` L81-90) — the worker is a gateway, not a database.
 */

import { AgentPolicyError } from './contract.js';
import type {
  CapabilitiesOutput,
  CatalogGetInput,
  CatalogGetOutput,
  CatalogSearchHit,
  CatalogSearchInput,
  CatalogSearchOutput,
  GatewayFacts,
  Principal,
} from './contract.js';
import {
  authorise,
  assertKnownTool,
  normalisePage,
  READ_ONLY_TOOLS,
} from './policy.js';

/** Fetches a declared route and returns its parsed JSON, or null when absent. */
export type RouteFetcher = (
  route: string,
) => Promise<unknown | null>;

export type AgentTools = {
  'catalog.search': (input: CatalogSearchInput, principal?: Principal | null) =>
    Promise<CatalogSearchOutput>;
  'catalog.get': (input: CatalogGetInput, principal?: Principal | null) =>
    Promise<CatalogGetOutput | null>;
  'capabilities.get': (facts: GatewayFacts, principal?: Principal | null) =>
    CapabilitiesOutput;
};

/**
 * Normalise the many shapes the upstream catalogue routes use.
 *
 * The routes are not uniform — `/api/all.json` and `/api/by-country/catalog.json` do not
 * necessarily wrap records the same way — so anything array-shaped is accepted and anything
 * else is treated as absent rather than guessed at. Guessing would produce a capability report
 * that claims data the worker does not actually have.
 */
function extractRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  for (const key of ['recipes', 'data', 'items', 'results', 'catalog']) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function readStringList(source: Record<string, unknown>, ...keys: string[]): string[] | undefined {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value as string[];
    }
  }
  return undefined;
}

/** Build the tool set around an injected route fetcher. */
export function createTools(fetchRoutes: RouteFetcher): AgentTools {
  return {
    async 'catalog.search'(input, principal) {
      // Authenticate and scope BEFORE the page is even parsed, so a stranger
      // cannot learn what a well-formed request looks like.
      authorise(principal, { calls: 1 });
      const { limit, offset } = normalisePage(input);

      const route =
        input.country && input.country.length > 0
          ? 'countryRecipes'
          : 'allRecipes';
      const payload = await fetchRoutes(route);
      const records = extractRecords(payload);

      const needle = input.q?.trim().toLowerCase() ?? '';
      const country = input.country?.trim().toLowerCase() ?? '';

      const matched = records.filter((record) => {
        if (country.length > 0) {
          const recordCountry = readString(record, 'country', 'pais')?.toLowerCase();
          if (recordCountry !== country) return false;
        }
        if (needle.length === 0) return true;
        const haystack = [
          readString(record, 'name', 'title', 'nombre'),
          readString(record, 'description', 'descripcion'),
        ]
          .filter((v): v is string => typeof v === 'string')
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });

      const page = matched.slice(offset, offset + limit);
      const hits: CatalogSearchHit[] = page.map((record) => {
        const id = readString(record, 'id', 'slug');
        const name = readString(record, 'name', 'title', 'nombre');
        // A record with neither an id nor a name cannot be fetched later, so it
        // is skipped rather than surfaced as an unusable hit.
        if (!id || !name) return null;
        const hit: CatalogSearchHit = { id, name };
        const recordCountry = readString(record, 'country', 'pais');
        if (recordCountry) hit.country = recordCountry;
        const url = readString(record, 'url');
        if (url) hit.url = url;
        return hit;
      }).filter((hit): hit is CatalogSearchHit => hit !== null);

      return {
        hits,
        total: matched.length,
        offset,
        limit,
        hasMore: offset + limit < matched.length,
      };
    },

    async 'catalog.get'(input, principal) {
      authorise(principal, { calls: 1 });
      const id = input?.id?.trim();
      if (!id) {
        // A policy error so the caller gets a stable `reason`, rather than a
        // TypeError from somewhere deeper in the tool.
        throw new AgentPolicyError('bad-input', 'catalog.get needs an id');
      }

      const payload = await fetchRoutes('allRecipes');
      const record = extractRecords(payload).find(
        (candidate) => readString(candidate, 'id', 'slug') === id,
      );
      if (!record) return null;

      const out: CatalogGetOutput = { id, name: readString(record, 'name', 'title', 'nombre') ?? id };
      const country = readString(record, 'country', 'pais');
      if (country) out.country = country;
      const description = readString(record, 'description', 'descripcion');
      if (description) out.description = description;
      const ingredients = readStringList(record, 'ingredients', 'ingredientes');
      if (ingredients) out.ingredients = ingredients;
      const steps = readStringList(record, 'steps', 'pasos', 'instructions');
      if (steps) out.steps = steps;
      const url = readString(record, 'url');
      if (url) out.url = url;
      return out;
    },

    'capabilities.get'(facts, principal) {
      // Authenticating this too keeps the surface uniform: an agent that cannot
      // call `capabilities.get` cannot discover what it is allowed to do.
      const p = authorise(principal, { calls: 0 });

      return {
        tools: [...READ_ONLY_TOOLS],
        readOnly: true,
        authentication: {
          header: 'x-api-key',
          modes: [
            'D1 api_keys table (tier and expiry checked)',
            'GOS_DEV_KEY when no key store is configured',
          ],
          onKeyStoreUnavailable:
            'fail-closed with 503; a key is never guessed from its own contents',
        },
        rateLimits: {
          freeDailyPerIp: facts.freeDailyLimit,
          freeTierNote: `${facts.freeDailyLimit} requests/day per IP for callers without a paid key`,
          paidTierNote: `tier ${p.tier}: rate limited by the gateway, not by this pilot`,
        },
        catalogAvailable: facts.keyStoreConfigured || facts.routes.allRecipes !== undefined,
        notProvided: [
          'any write, purchase or configuration change',
          "access to another workspace's private records",
          'medical or clinical data of any kind',
          'payments: the subscription is settled by swal-billing, not by these tools',
        ],
        status: {
          catalog: facts.routes.allRecipes ? 'available' : 'awaiting-founder',
          'mcp-endpoint': 'awaiting-founder',
          'paid-tier-enforcement': 'available',
        },
      };
    },
  };
}

/**
 * Dispatch by name.
 *
 * Exists so an agent asking for an unlisted tool gets a refusal naming the tools
 * it may use, rather than `undefined is not a function`.
 */
export function invoke(
  tools: AgentTools,
  name: string,
  payload: unknown,
  principal?: Principal | null,
): Promise<unknown> {
  assertKnownTool(name);
  const tool = tools[name as keyof AgentTools] as (
    input: unknown,
    principal?: Principal | null,
  ) => Promise<unknown>;
  return tool(payload, principal);
}
