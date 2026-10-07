#!/usr/bin/env bash
# Gate de verificacion del fix de autenticacion del gateway GOS.
#
# Un suite que solo pasa no demuestra nada: hay que comprobar que FALLA cuando
# el bug vuelve. Este script reintroduce cada rama vulnerable una a una
# (test/mutations.py) y exige que la suite se ponga roja en cada caso.
#
# Uso: ./test/mutation-check.sh
# Aplica y revierte src/index.ts automaticamente. No toca git.

set -uo pipefail
cd "$(dirname "$0")/.."

SRC="src/index.ts"
BACKUP="$(mktemp)"
cp "$SRC" "$BACKUP"
restore() { cp "$BACKUP" "$SRC"; rm -f "$BACKUP"; }
trap restore EXIT

PASS=0
FAIL=0
TOTAL=$(python3 test/mutations.py list | wc -l)

# Un gate que no puede fallar no vale nada: si la lista de mutaciones sale
# vacia (mutations.py roto), abortar en vez de declarar "GATE OK" sobre 0/0.
if [ "$TOTAL" -lt 5 ]; then
  echo "GATE ABORTADO: se esperaban >=5 mutaciones y se listaron $TOTAL."
  echo "Revisar test/mutations.py antes de confiar en este resultado."
  exit 1
fi
echo "Mutaciones registradas: $TOTAL"

echo "=== Baseline (codigo fijado, sin mutaciones) ==="
BASE="$(npx vitest run 2>&1)"
echo "$BASE" | grep -E 'Tests +[0-9]+ (passed|failed)' || {
  echo "GATE ABORTADO: la suite no corrio."
  exit 1
}
if ! echo "$BASE" | grep -qE 'Tests +[0-9]+ passed'; then
  echo "GATE ABORTADO: el codigo fijado no esta en verde."
  exit 1
fi
echo

i=1
while [ "$i" -le "$TOTAL" ]; do
  NAME=$(python3 test/mutations.py list | sed -n "${i}p" | cut -f2)
  cp "$BACKUP" "$SRC"

  if ! python3 test/mutations.py "$i" "$SRC" >/dev/null 2>/tmp/mut.err; then
    echo "  [ERROR] mutacion $i ($NAME) no aplico: $(cat /tmp/mut.err)"
    FAIL=$((FAIL+1))
    i=$((i+1))
    continue
  fi

  OUT="$(npx vitest run 2>&1)"
  if echo "$OUT" | grep -qiE 'SyntaxError|Transform failed|Unexpected token'; then
    echo "  [ERROR] mutacion $i ($NAME) produce codigo invalido: no cuenta como deteccion"
    FAIL=$((FAIL+1))
    i=$((i+1))
    continue
  fi

  if echo "$OUT" | grep -qE 'Tests +[0-9]+ failed'; then
    N=$(echo "$OUT" | grep -oE 'Tests +[0-9]+ failed' | grep -oE '[0-9]+' | head -1)
    echo "  [OK] mutacion $i ($NAME) -> suite ROJA ($N test(s) en rojo)"
    PASS=$((PASS+1))
  else
    echo "  [FALLO] mutacion $i ($NAME) -> suite SIGUE EN VERDE: ningun test detecta este bug"
    FAIL=$((FAIL+1))
  fi
  i=$((i+1))
done

restore
trap - EXIT

echo
echo "=== Resultado del gate ==="
echo "mutaciones aplicadas y detectadas : $PASS / $TOTAL"
echo "mutaciones NO detectadas/fallidas: $FAIL"
if [ "$FAIL" -ne 0 ] || [ "$PASS" -ne "$TOTAL" ]; then
  echo "GATE FALLIDO: alguna rama vulnerable no esta cubierta."
  exit 1
fi
echo "GATE OK: reintroducir cualquiera de los $TOTAL bugs pone la suite en rojo."
