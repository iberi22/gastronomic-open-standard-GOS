#!/usr/bin/env bash
# Verificaciones previas al deploy del gateway ABIERTO de GOS. NO despliega ni
# escribe en remoto: solo lee (whoami, d1 list, secret list) e imprime el
# comando de esquema para que lo ejecute una persona.
#
#   uso: worker/scripts/predeploy-check.sh   (desde cualquier directorio)
#
# 2026-10-15: GOS dejo de vender acceso. Ya no hay secretos de negocio
# (SERVICE_SHARED_SECRET / GOS_DEV_KEY) ni binding RL_AUTH: este chequeo los
# reporta como FALLO solo si reaparecen, no como requisito.

set -uo pipefail
cd "$(dirname "$0")/.."

WR="npx --no-install wrangler"
# Nombres que NO deben existir mientras GOS sea abierto.
FORBIDDEN_SECRETS=(SERVICE_SHARED_SECRET BILLING_SERVICE_SECRET GOS_DEV_KEY GOS_PAID_KEY)
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

echo "== secretos del worker (no debe quedar ninguno de cobro)"
if secrets=$($WR secret list 2>/dev/null); then
  for s in "${FORBIDDEN_SECRETS[@]}"; do
    if grep -q "\"$s\"" <<<"$secrets"; then
      bad "secreto de cobro todavia presente: $s (wrangler secret delete $s)"
    else
      ok "sin secreto $s"
    fi
  done
else
  ok "no se pudo listar secretos (opcional: el gateway abierto no usa ninguno)"
fi

echo "== bindings en wrangler.toml"
grep -q 'name = "RL_FREE_BURST"' wrangler.toml && ok "RL_FREE_BURST" || bad "falta [[ratelimits]] RL_FREE_BURST"
for b in RL_AUTH AI; do
  if grep -qE "name = \"$b\"|^binding = \"$b\"|^\[ai\]" wrangler.toml; then
    bad "binding de cobro todavia declarado: $b"
  else
    ok "sin binding $b"
  fi
done
grep -q 'kv_namespaces' wrangler.toml && bad "wrangler.toml aun declara KV" || ok "sin KV"
grep -q '^BILLING_URL' wrangler.toml && bad "wrangler.toml aun declara BILLING_URL" || ok "sin BILLING_URL"

echo "== esquema (idempotente: solo CREATE ... IF NOT EXISTS)"
if grep -iE '^\s*(CREATE (TABLE|INDEX)|CREATE UNIQUE INDEX)' schema.sql | grep -viq 'IF NOT EXISTS'; then
  bad "schema.sql tiene CREATE sin IF NOT EXISTS"
else ok "schema.sql idempotente"; fi
echo "Aplicar a mano ANTES del deploy (crea/actualiza free_quota):"
echo "  npx wrangler d1 execute DB --remote --file=schema.sql   # desde worker/ (DB = binding; el nombre del toml no coincide con la cuenta)"

[ "$fail" = 0 ] && echo "RESULTADO: listo para deploy" || echo "RESULTADO: HAY FALLAS"
exit "$fail"
