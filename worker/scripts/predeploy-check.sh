#!/usr/bin/env bash
# Verificaciones previas al deploy del gateway ABIERTO de GOS. NO despliega ni
# escribe en remoto: solo lee (whoami, secret list).
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

echo "== sin base de datos (el gateway no usa D1)"
grep -q '^\[\[d1_databases\]\]' wrangler.toml && bad "wrangler.toml aun declara D1" || ok "sin binding D1"

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

[ "$fail" = 0 ] && echo "RESULTADO: listo para deploy" || echo "RESULTADO: HAY FALLAS"
exit "$fail"
