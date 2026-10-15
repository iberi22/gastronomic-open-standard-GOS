-- D1 billing ledger — Fase 3
--
-- OBSOLETO desde 2026-10-15: la membresia es global (un solo plan SWAL para
-- todas las apps) y la cuota de IA la gestiona la plataforma, no cada app.
-- Las tablas `credits` e `invoices` ya no las escribe ni lee ningun codigo de
-- GOS (site/src/lib/billing.ts y site/workers/ai.ts fueron eliminados).
-- Se conserva esta migracion porque ya fue aplicada: no se borra una migracion
-- aplicada. Antes de reutilizarlas, definir el nuevo dueno del ledger.
--
-- R2/KV son bindings Cloudflare, no tablas; AI es binding Workers AI.
-- Ejecutar: wrangler d1 execute swal-billing --file=./migrations/001_billing.sql

CREATE TABLE IF NOT EXISTS credits (
  appId TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'socio',
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  appId TEXT NOT NULL,
  infra REAL NOT NULL,
  aiBase REAL NOT NULL,
  aiWithMargin REAL NOT NULL,
  handling REAL NOT NULL,
  total REAL NOT NULL,
  tokensUsed INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  FOREIGN KEY (appId) REFERENCES credits(appId)
);

CREATE INDEX IF NOT EXISTS idx_invoices_appId ON invoices(appId);
