-- Esquema D1 del gateway de agentes (GOS).
--
-- SEGURIDAD — este archivo NO debe contener credenciales reales.
-- Una key sembrada aqui queda en el historial de git de un repositorio
-- PUBLICO para siempre: no hay forma de borrarla sin reescribir la historia
-- (ya ocurrio una vez, ver git log de schema.sql). Todo valor sembrado abajo
-- es un PLACEHOLDER explicito y no autentica nada: la validacion real ocurre
-- contra lo que el operador cargue en la DB, nunca contra este archivo.
--
-- Sembrar una key real, en produccion:
--   wrangler d1 execute gos-billing --remote --command \
--     "INSERT INTO api_keys (key, tier, status, expires_at) VALUES ('<KEY>', 'tiersocio', 'active', NULL)"
-- (o mejor, via variable de entorno y un pipeline de provisioning; nunca en git)
--
-- Aplicar este esquema (NO ejecutado en esta fase, requiere autorizacion):
--   wrangler d1 execute gos-billing --remote --file=./schema.sql

-- ---------------------------------------------------------------------------
-- Tabla de credenciales del gateway. Fuente UNICA de verdad para deciding si
-- una x-api-key concede tier de pago. Sin esta tabla el gateway no puede
-- autenticar nada y responde 503 (fail-closed), nunca acceso.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  -- Valor crudo de la cabecera x-api-key. Se compara por igualdad exacta.
  key        TEXT PRIMARY KEY NOT NULL,
  -- 'free' | 'tiersocio' | 'tiersocio-managed' | 'enterprise' ...
  tier       TEXT NOT NULL DEFAULT 'free',
  -- 'active' | 'suspended' | 'revoked'. Solo 'active' concede acceso.
  status     TEXT NOT NULL DEFAULT 'active',
  -- Titular de la key, para auditoria/revocacion. No es secreto.
  owner      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- NULL = sin expiracion. Una key con expires_at en el pasado se rechaza (401)
  -- aunque su status siga en 'active'.
  expires_at TEXT
);

-- Indice por key. La PRIMARY KEY ya genera un indice unico; este indice
-- explicito cubre el patron real de consulta del gateway
-- (key = ? AND status = ? AND expires_at > now) sin depender de la
-- colision de nombres de SQLite con el autoindice.
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- Indice de apoyo para revocacion/auditoria por estado y vencimiento.
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- Nota: no hay seed. Las keys se.Insertan una a una en cada entorno.
