-- NO DESPLEGADO. Historico: el gateway GOS no usa base de datos desde 2026-10-21.
-- Este esquema D1 (free_quota, api_keys, credit_ledger) ya no se aplica ni lo lee el Worker.
-- Se conserva solo como referencia de migraciones antiguas. No ejecutar contra produccion.

-- site/../worker/schema.sql — esquema D1 del gateway de datos abiertos GOS.
--
-- ESTADO 2026-10-15: "api_keys" y "credit_ledger" YA NO SE USAN. GOS dejo de
-- vender acceso: el gateway no lee ninguna key, no valida tiers y no lleva
-- credito de inferencia (/api/ai/infer responde 404). Las tablas se conservan
-- SIN BORRAR porque pudieron tener datos aplicados en produccion y un DROP no
-- es una migracion. La unica tabla viva es free_quota.
--
-- SEGURIDAD: este archivo NO debe contener credenciales. Una key sembrada
-- aqui queda en el historial de git de un repositorio PUBLICO para siempre
-- (se isla en https://github.com/iberi22/gastronomic-open-standard-GOS
-- desde el commit e0ecaa91) y no hay forma de "borrarla" del historial sin
-- reescribir toda la historia. Ya no deberia existir ninguna key que sembrar.

-- Tabla de keys — SIN USO desde 2026-10-15 (ver cabecera). Se conserva por
-- historia de migraciones; el gateway no la consulta.
CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  tier TEXT NOT NULL,
  owner TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- NULL = sin vencimiento. La consulta de auth acepta NULL o fecha futura,
  -- y rechaza cualquier expires_at en el pasado.
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'active'
);

-- Indice historico de api_keys (sin uso desde 2026-10-15).
CREATE INDEX IF NOT EXISTS idx_api_keys_key
  ON api_keys (key, status, expires_at);

-- Ledger de credito de inferencia — SIN USO desde 2026-10-15: no hay
-- inferencia ni credito. Se conserva por historia de migraciones.
CREATE TABLE IF NOT EXISTS credit_ledger (
  key_id TEXT NOT NULL,
  period TEXT NOT NULL,           -- YYYY-MM
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, period)
);

-- Cuota diaria ANONIMA por IP (hash sha256 truncado, nunca la IP en
-- claro). Unica tabla viva del gateway. Se incrementa con UN solo UPSERT
-- atomico por peticion NO estatica. Los dias viejos no se leen; se pueden
-- purgar con:
--   DELETE FROM free_quota WHERE day < date('now', '-2 day');
CREATE TABLE IF NOT EXISTS free_quota (
  ip_key TEXT NOT NULL,
  day TEXT NOT NULL,              -- YYYY-MM-DD
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_key, day)
);
