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

-- Tabla de keys. Sin ella el gateway no puede validar nada y falla cerrado
-- con 503 para todas las peticiones con key: ese es el comportamiento
-- correcto, no un bug.
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

-- La consulta de auth filtra por key + status + expires_at, asi que el indice
-- debe cubrir los tres: sin el, cada peticion con key recorre la tabla entera.
-- El nombre lo exige test/schema.test.ts (idx_api_keys_key), aunque key ya es
-- PRIMARY KEY y sqlite ya le crea un autoindice: lo que aporta este es el
-- orden por status y expires_at, no el acceso por key.
CREATE INDEX IF NOT EXISTS idx_api_keys_key
  ON api_keys (key, status, expires_at);
