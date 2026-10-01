-- site/../worker/schema.sql — esquema D1 del gateway de agentes.
--
-- SEGURIDAD: este archivo NO debe contener credenciales. Una key sembrada
-- aqui queda en el historial de git de un repositorio PUBLICO para siempre
-- (se isla en https://github.com/iberi22/gastronomic-open-standard-GOS
-- desde el commit e0ecaa91) y no hay forma de "borrarla" del historial sin
-- reescribir toda la historia.
--
-- El seed de una key de pago se hace por variable de entorno en el deploy:
--   wrangler secret put GOS_PAID_KEY
-- y se carga en runtime. Para desarrollo local, un valor descartable aqui
-- es aceptable SOLO si nunca se despliega.

CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  tier TEXT NOT NULL,
  owner TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);

-- Seed de DESARROLLO LOCAL. No usar en produccion: esta clave queda
-- versionada. La key real va en `wrangler secret put GOS_PAID_KEY`.
INSERT OR IGNORE INTO api_keys (key, tier, owner, status)
VALUES ('DEV_ONLY_local_socio_key', 'tiersocio', 'local_dev', 'active');
