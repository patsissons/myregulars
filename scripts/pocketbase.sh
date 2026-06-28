#!/usr/bin/env bash
set -euo pipefail

# Launches a local PocketBase instance for myregulars development.
#
# On first run it downloads the PocketBase binary into ./pocketbase, then serves
# with the committed migrations in ./pocketbase/pb_migrations applied. Data lives
# in ./pocketbase/pb_data (gitignored).
#
# Env overrides:
#   PB_VERSION  pin a specific PocketBase version (default: latest release)
#   PB_HOST     bind host (default: 127.0.0.1)
#   PB_PORT     bind port (default: 8090)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_DIR="$ROOT_DIR/pocketbase"
BIN="$PB_DIR/pocketbase"

PB_HOST="${PB_HOST:-127.0.0.1}"
PB_PORT="${PB_PORT:-8090}"

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
  # Parse with pipefail disabled so a benign SIGPIPE from grep -m1 can't fail us.
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

if [ ! -x "$BIN" ]; then
  download
fi

echo "Starting PocketBase on http://${PB_HOST}:${PB_PORT} (admin UI at /_/)"
exec "$BIN" serve \
  --dir="$PB_DIR/pb_data" \
  --migrationsDir="$PB_DIR/pb_migrations" \
  --http="${PB_HOST}:${PB_PORT}"
