CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  tier TEXT NOT NULL,
  owner TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);

INSERT OR IGNORE INTO api_keys (key, tier, owner, status)
VALUES ('gos_paid_socio_key_2026', 'tiersocio', 'health_app_client', 'active');
