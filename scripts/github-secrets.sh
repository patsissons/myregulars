#!/usr/bin/env bash
set -euo pipefail

# Creates the GitHub `production` environment and fills its secrets and
# variable from .env.local, so the deploy workflows can run. Idempotent: rerun
# after rotating a value. Needs the gh CLI, signed in with repo admin rights.
#
#   scripts/github-secrets.sh            # uses the origin remote's repo
#   scripts/github-secrets.sh owner/repo
#
# Mapping (.env.local → GitHub):
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID  → same names
#   GITHUB_OAUTH_CLIENT_ID / _SECRET            → GIST_OAUTH_CLIENT_ID / _SECRET
#                                                 (GitHub forbids names starting with GITHUB_)
#   PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD  → same names (your PocketHost login)
#   variable NEXT_PUBLIC_POCKETBASE_URL          → the hosted instance URL

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_NAME="production"
REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
POCKETBASE_URL="${NEXT_PUBLIC_POCKETBASE_URL_PROD:-https://myregulars.pockethost.io}"

load_env_file() {
  local file="$1"
  [ -f "$file" ] || { echo "missing $file" >&2; exit 1; }
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in '' | \#*) continue ;; esac
    line="${line#export }"
    local key="${line%%=*}"
    [ "$key" = "$line" ] && continue
    local val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
    export "$key=$val"
  done <"$file"
}
load_env_file "$ROOT_DIR/.env.local"

echo "Repository: $REPO · environment: $ENV_NAME"
gh api -X PUT "repos/$REPO/environments/$ENV_NAME" --silent
echo "✓ environment exists"

set_secret() {
  local gh_name="$1" env_name="$2"
  local value="${!env_name:-}"
  if [ -z "$value" ]; then
    echo "✗ $gh_name: $env_name is not set in .env.local (skipped)" >&2
    MISSING=1
    return 0
  fi
  printf '%s' "$value" | gh secret set "$gh_name" --repo "$REPO" --env "$ENV_NAME"
  echo "✓ secret $gh_name (from $env_name)"
}

MISSING=0
set_secret CLOUDFLARE_API_TOKEN      CLOUDFLARE_API_TOKEN
set_secret CLOUDFLARE_ACCOUNT_ID     CLOUDFLARE_ACCOUNT_ID
set_secret GIST_OAUTH_CLIENT_ID      GITHUB_OAUTH_CLIENT_ID
set_secret GIST_OAUTH_CLIENT_SECRET  GITHUB_OAUTH_CLIENT_SECRET
set_secret PB_SUPERUSER_EMAIL        PB_SUPERUSER_EMAIL
set_secret PB_SUPERUSER_PASSWORD     PB_SUPERUSER_PASSWORD

gh variable set NEXT_PUBLIC_POCKETBASE_URL --repo "$REPO" --env "$ENV_NAME" --body "$POCKETBASE_URL"
echo "✓ variable NEXT_PUBLIC_POCKETBASE_URL=$POCKETBASE_URL"

# Optional: reuse one registered phio deploy key instead of a new one per run.
PHIO_KEY="${PHIO_HOME:-$HOME/Library/Preferences/phio-nodejs}/phio_deploy_ed25519"
if [ -f "$PHIO_KEY" ]; then
  gh secret set PHIO_DEPLOY_KEY --repo "$REPO" --env "$ENV_NAME" < "$PHIO_KEY"
  echo "✓ secret PHIO_DEPLOY_KEY (from $PHIO_KEY)"
else
  echo "· PHIO_DEPLOY_KEY skipped: no key at $PHIO_KEY yet (run \`npm run pb:deploy\` once, then rerun)"
fi

if [ "$MISSING" = 1 ]; then
  echo "Some values were missing; add them to .env.local and rerun." >&2
  exit 1
fi
echo "Done."
