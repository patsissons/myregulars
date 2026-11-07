#!/usr/bin/env bash
set -euo pipefail

# Runs PocketHost's phio CLI with the account login taken from the environment
# or .env.local, so `npm run pb:deploy` / `npm run pb:dev` never prompt. The
# PocketHost login is the same pair the local PocketBase superuser uses
# (PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD). Usage: scripts/phio.sh <phio args>

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in '' | \#*) continue ;; esac
    line="${line#export }"
    local key="${line%%=*}"
    [ "$key" = "$line" ] && continue
    if [ -z "${!key+x}" ]; then
      local val="${line#*=}"
      val="${val%\"}"
      val="${val#\"}"
      val="${val%\'}"
      val="${val#\'}"
      export "$key=$val"
    fi
  done <"$file"
}
load_env_file "$ROOT_DIR/.env.local"

export PHIO_USERNAME="${PHIO_USERNAME:-${PB_SUPERUSER_EMAIL:-}}"
export PHIO_PASSWORD="${PHIO_PASSWORD:-${PB_SUPERUSER_PASSWORD:-}}"

if [ -z "$PHIO_USERNAME" ] || [ -z "$PHIO_PASSWORD" ]; then
  echo "phio: set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in .env.local (your PocketHost login)." >&2
  exit 1
fi

# phio syncs `pb_*` (and package.json) from the directory that holds
# .phioconfig; this repo keeps PocketBase under pocketbase/, so root it there.
export PHIO_PROJECT_DIR="$ROOT_DIR/pocketbase"
cd "$ROOT_DIR"
exec npx phio "$@"
