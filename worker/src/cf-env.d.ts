// Tipos mínimos Cloudflare para typecheck sin @cloudflare/workers-types
// (red medida: sin installs; el deploy real valida con wrangler).
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(
    key: string,
    value: string,
    opts?: { expirationTtl?: number },
  ): Promise<void>
}

interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<unknown>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
}
