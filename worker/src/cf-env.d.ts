// Tipos mínimos Cloudflare para typecheck sin @cloudflare/workers-types
// (red medida: sin installs; el deploy real valida con wrangler).
interface RateLimit {
  limit(opts: { key: string }): Promise<{ success: boolean }>
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

interface Cache {
  match(req: Request): Promise<Response | undefined>
  put(req: Request, res: Response): Promise<void>
}
