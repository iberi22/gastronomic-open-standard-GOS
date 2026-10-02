#!/usr/bin/env bash
# Verificaciones previas al deploy del gateway. NO despliega ni escribe en
# remoto: solo lee (whoami, d1 list, secret list) e imprime el comando de
# esquema para que lo ejecute una persona.
#   uso: worker/scripts/predeploy-check.sh   (desde cualquier directorio)
set -uo pipefail
cd "$(dirname "$0")/.."

WR="npx --no-install wrangler"
REQUIRED_SECRETS=()
# SERVICE_SHARED_SECRET solo hace falta si BILLING_URL esta activo (sin
# comentar) en wrangler.toml.
grep -q '^BILLING_URL' wrangler.toml && REQUIRED_SECRETS=(SERVICE_SHARED_SECRET)
OPTIONAL_SECRETS=(BILLING_SERVICE_SECRET GOS_DEV_KEY)  # compat/dev: no deben ser necesarios
fail=0
ok()   { echo "OK    $*"; }
bad()  { echo "FALLA $*"; fail=1; }

echo "== wrangler whoami"
if who=$($WR whoami 2>&1) && ! grep -qi "not authenticated" <<<"$who"; then
  ok "autenticado"; grep -iE "email|account" <<<"$who" | head -3
else
  bad "wrangler no autenticado (wrangler login / CLOUDFLARE_API_TOKEN)"
fi

echo "== binding D1"
db_name=$(sed -n '/^\[\[d1_databases\]\]/,/^\[/{s/^database_name *= *"\(.*\)"/\1/p}' wrangler.toml | head -1)
db_id=$(sed -n '/^\[\[d1_databases\]\]/,/^\[/{s/^database_id *= *"\(.*\)"/\1/p}' wrangler.toml | head -1)
echo "wrangler.toml: $db_name ($db_id)"
if list=$($WR d1 list --json 2>/dev/null); then
  remote_name=$(python3 -c '
import json,sys
i=sys.argv[1]
for d in json.load(sys.stdin):
    if (d.get("uuid") or d.get("id"))==i: print(d.get("name")); break
' "$db_id" <<<"$list")
  if [ -z "$remote_name" ]; then bad "database_id $db_id no existe en la cuenta"
  elif [ "$remote_name" = "$db_name" ]; then ok "database_id coincide ($remote_name)"
  else ok "database_id existe, pero se llama '$remote_name' en la cuenta (toml: '$db_name'); el id manda"; fi
else
  bad "no se pudo listar D1 (wrangler d1 list)"
fi

echo "== secretos del worker"
if secrets=$($WR secret list 2>/dev/null); then
  [ ${#REQUIRED_SECRETS[@]} -eq 0 ] && echo "INFO  BILLING_URL inactivo: ningun secreto obligatorio"
  for s in "${REQUIRED_SECRETS[@]}"; do
    grep -q "\"$s\"" <<<"$secrets" && ok "secreto $s" || bad "falta el secreto $s (wrangler secret put $s)"
  done
  for s in "${OPTIONAL_SECRETS[@]}"; do
    grep -q "\"$s\"" <<<"$secrets" && echo "AVISO secreto opcional/legacy presente: $s"
  done
else
  bad "no se pudo listar secretos (wrangler secret list)"
fi

echo "== bindings de rate limit en wrangler.toml"
for b in RL_FREE_BURST RL_AUTH; do
  grep -q "name = \"$b\"" wrangler.toml && ok "$b" || bad "falta [[ratelimits]] $b"
done
grep -q 'kv_namespaces' wrangler.toml && bad "wrangler.toml aun declara KV" || ok "sin KV"

echo "== esquema (idempotente: solo CREATE ... IF NOT EXISTS)"
if grep -iE '^\s*(CREATE (TABLE|INDEX)|CREATE UNIQUE INDEX)' schema.sql | grep -viq 'IF NOT EXISTS'; then
  bad "schema.sql tiene CREATE sin IF NOT EXISTS"
else ok "schema.sql idempotente"; fi
echo "Aplicar a mano ANTES del deploy (crea free_quota):"
echo "  npx wrangler d1 execute DB --remote --file=schema.sql   # desde worker/ (DB = binding; el nombre del toml no coincide con la cuenta)"

[ "$fail" = 0 ] && echo "RESULTADO: listo para deploy" || echo "RESULTADO: HAY FALLAS"
exit "$fail"
