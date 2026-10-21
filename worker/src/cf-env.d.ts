// Tipos mínimos Cloudflare para typecheck sin @cloudflare/workers-types
// (red medida: sin installs; el deploy real valida con wrangler).
interface RateLimit {
  limit(opts: { key: string }): Promise<{ success: boolean }>
}

interface Cache {
  match(req: Request): Promise<Response | undefined>
  put(req: Request, res: Response): Promise<void>
}
