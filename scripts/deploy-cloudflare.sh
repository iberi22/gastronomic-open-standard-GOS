#!/usr/bin/env bash
# Deploy GOS site to Cloudflare Pages (canonical single-target deploy).
# GitHub Pages retired 2026-09-05 — Cloudflare Pages (gos-site.pages.dev) only.
#
# Token resolution order (never commit a token, never echo it):
#   1. $CLOUDFLARE_API_TOKEN (env, CI secret or your shell)
#   2. $HOME/.hermes/.env  (central SWAL vault, mode 0600)
# Account ID: $CLOUDFLARE_ACCOUNT_ID or repo var (963f01052b7f84cb785e72ba2b4d6e12).
#
# Usage:
#   ./scripts/deploy-cloudflare.sh            # build + deploy + smoke
#   ./scripts/deploy-cloudflare.sh --build-only
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="gos-site"
SITE_DIR="site"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -f "$HOME/.hermes/.env" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$HOME/.hermes/.env"; set +a
fi

if [[ "${1:-}" != "--build-only" ]]; then
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "ERROR: CLOUDFLARE_API_TOKEN not set." >&2
    echo "  export CLOUDFLARE_API_TOKEN (or add it to ~/.hermes/.env, mode 0600)," >&2
    echo "  or set the gh secret: gh secret set CLOUDFLARE_API_TOKEN --repo iberi22/gastronomic-open-standard-GOS" >&2
    exit 1
  fi
  if [[ -z "$ACCOUNT_ID" ]]; then
    ACCOUNT_ID="963f01052b7f84cb785e72ba2b4d6e12"
  fi
fi

echo "==> [1/4] install (frozen lockfile)"
(cd "$SITE_DIR" && pnpm install --frozen-lockfile)

echo "==> [2/4] generate content"
(cd "$SITE_DIR" && node scripts/copy-content.js && node scripts/generate-api.js \
  && node scripts/generate-catalog.js && node scripts/enrich-ingredients.js \
  && node scripts/generate-graph.js)

echo "==> [3/4] astro build"
(cd "$SITE_DIR" && pnpm exec astro build)

if [[ "${1:-}" == "--build-only" ]]; then
  echo "build-only: dist ready at $SITE_DIR/dist (no deploy)"
  exit 0
fi

echo "==> [4/4] pages deploy"
(cd "$SITE_DIR" && pnpm exec wrangler pages deploy dist \
  --project-name="$PROJECT" --branch=main --commit-dirty=true)

echo "==> smoke"
for i in 1 2 3 4 5; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "https://gos-site.pages.dev/") || CODE="000"
  [[ "$CODE" == "200" ]] && break
  echo "  attempt $i: HTTP $CODE, retry in 15s…"
  sleep 15
done
echo "  https://gos-site.pages.dev/ -> HTTP $CODE"
[[ "$CODE" == "200" ]] || { echo "SMOKE FAILED"; exit 1; }
curl -s -o /dev/null -w "  api/health -> HTTP %{http_code}\n" -m 20 "https://gos-site.pages.dev/api/health"
echo "DEPLOY OK"
