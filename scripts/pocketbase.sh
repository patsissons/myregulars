#!/usr/bin/env bash
set -euo pipefail

# Launches a local PocketBase instance for myregulars development and lazily
# initializes everything it needs to be functional:
#   * downloads the PocketBase binary on first run
#   * applies the committed migrations (collections)
#   * ensures a superuser from PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD
#   * configures social-login OAuth2 providers from PB_OAUTH2_<PROVIDER>_* secrets
#
# Configuration is read from .env (committed defaults) and .env.local (secrets),
# with the real shell environment taking precedence. Data lives in
# ./pocketbase/pb_data (gitignored).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_DIR="$ROOT_DIR/pocketbase"
BIN="$PB_DIR/pocketbase"

# ── Load env files (shell env wins, then .env.local, then .env) ──────────────
load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in '' | \#*) continue ;; esac
    line="${line#export }"
    local key="${line%%=*}"
    [ "$key" = "$line" ] && continue # no '=' on the line
    if [ -z "${!key+x}" ]; then       # only set if not already in the environment
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
load_env_file "$ROOT_DIR/.env"

PB_HOST="${PB_HOST:-127.0.0.1}"
PB_PORT="${PB_PORT:-8090}"
BASE_URL="http://${PB_HOST}:${PB_PORT}"

resolve_version() {
  if [ -n "${PB_VERSION:-}" ]; then
    echo "$PB_VERSION"
    return
  fi
  # Materialize the response first: piping curl straight into `grep -m1` makes
  # grep close the pipe early, which SIGPIPEs curl (exit 23) and, under
  # `set -o pipefail`, aborts the whole script.
  local body
  body="$(curl -fsSL https://api.github.com/repos/pocketbase/pocketbase/releases/latest)" || return 1
  (
    set +o pipefail
    printf '%s\n' "$body" | grep -m1 '"tag_name"' | sed -E 's/.*"v?([^"]+)".*/\1/'
  )
}

download() {
  local version os arch url tmp
  version="$(resolve_version)"
  if [ -z "$version" ]; then
    echo "Could not resolve a PocketBase version. Set PB_VERSION explicitly." >&2
    exit 1
  fi

  case "$(uname -s)" in
  Darwin) os="darwin" ;;
  Linux) os="linux" ;;
  *)
    echo "Unsupported OS: $(uname -s). Download PocketBase manually into $PB_DIR." >&2
    exit 1
    ;;
  esac

  case "$(uname -m)" in
  x86_64 | amd64) arch="amd64" ;;
  arm64 | aarch64) arch="arm64" ;;
  *)
    echo "Unsupported arch: $(uname -m)." >&2
    exit 1
    ;;
  esac

  url="https://github.com/pocketbase/pocketbase/releases/download/v${version}/pocketbase_${version}_${os}_${arch}.zip"
  tmp="$(mktemp -d)"
  echo "Downloading PocketBase v${version} (${os}/${arch})…"
  curl -fsSL "$url" -o "$tmp/pb.zip"
  # Extract only the binary; skip the bundled CHANGELOG/LICENSE.
  unzip -oq "$tmp/pb.zip" pocketbase -d "$PB_DIR"
  rm -rf "$tmp"
  chmod +x "$BIN"
}

# ── Lazy init: superuser ─────────────────────────────────────────────────────
ensure_superuser() {
  [ -n "${PB_SUPERUSER_EMAIL:-}" ] && [ -n "${PB_SUPERUSER_PASSWORD:-}" ] || return 0
  if "$BIN" superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" \
    --dir="$PB_DIR/pb_data" >/dev/null 2>&1; then
    echo "Ensured superuser: $PB_SUPERUSER_EMAIL"
  else
    echo "Warning: could not upsert superuser." >&2
  fi
}

# ── Boot ─────────────────────────────────────────────────────────────────────
if [ ! -x "$BIN" ]; then
  download
fi

ensure_superuser

echo "Starting PocketBase on $BASE_URL (admin UI at /_/)"
# The pb_hooks bootstrap (pocketbase/pb_hooks/main.pb.js) configures OAuth2
# providers from PB_OAUTH2_* env vars on startup — the same mechanism works on
# PocketHost. --automigrate=0 so that config change isn't written as a migration
# file into the committed pb_migrations dir.
exec "$BIN" serve \
  --dir="$PB_DIR/pb_data" \
  --migrationsDir="$PB_DIR/pb_migrations" \
  --hooksDir="$PB_DIR/pb_hooks" \
  --automigrate=0 \
  --http="${PB_HOST}:${PB_PORT}"
