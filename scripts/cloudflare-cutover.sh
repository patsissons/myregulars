#!/usr/bin/env bash
set -euo pipefail

# Points myregulars.app at the deployed Cloudflare Worker.
#
# The zone already lives on Cloudflare; its apex currently has DNS-only A
# records aimed at Vercel. This script shows the plan, then attaches the
# deletes those records (Cloudflare refuses to attach while they exist) and
# attaches the hostname to the Worker, which then manages its own records and
# certificate. Re-running is safe.
#
#   scripts/cloudflare-cutover.sh            # dry run: print what would change
#   scripts/cloudflare-cutover.sh --apply    # do it
#   HOSTNAMES="myregulars.app www.myregulars.app" scripts/cloudflare-cutover.sh --apply
#
# Reads CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID from the environment or
# .env.local. The token needs Account:Workers Scripts:Edit, Zone:Workers
# Routes:Edit and Zone:DNS:Edit (to remove the old records), all scoped to the zone.
# Deploy the Worker first (merge main, or `npm run cf:deploy`).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZONE_NAME="myregulars.app"
WORKER_NAME="$(python3 -c 'import json,re,sys; s=open(sys.argv[1]).read(); s=re.sub(r"//[^\n]*","",s); print(json.loads(re.sub(r",(\s*[}\]])",r"\1",s))["name"])' "$ROOT_DIR/wrangler.jsonc")"
HOSTNAMES="${HOSTNAMES:-$ZONE_NAME}"
APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1

load_env_file() {
  local file="$1"; [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in '' | \#*) continue ;; esac
    line="${line#export }"; local key="${line%%=*}"; [ "$key" = "$line" ] && continue
    if [ -z "${!key+x}" ]; then local val="${line#*=}"; val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"; export "$key=$val"; fi
  done <"$file"
}
load_env_file "$ROOT_DIR/.env.local"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}" "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"

API="https://api.cloudflare.com/client/v4"
cf() { curl -fsS "$API$1" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" "${@:2}"; }
jq_py() { python3 -c "import sys,json; d=json.load(sys.stdin); $1"; }

ZONE_ID="$(cf "/zones?name=$ZONE_NAME" | jq_py 'print(d["result"][0]["id"])')"
echo "zone $ZONE_NAME = $ZONE_ID · worker $WORKER_NAME · hostnames: $HOSTNAMES · $([ $APPLY = 1 ] && echo APPLY || echo DRY RUN)"

# The Worker must exist before a custom domain can point at it.
if ! cf "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME" >/dev/null 2>&1; then
  echo "✗ Worker '$WORKER_NAME' is not deployed yet. Merge to main (deploy.yml) or run: npm run cf:deploy" >&2
  exit 1
fi
echo "✓ Worker '$WORKER_NAME' is deployed"

for host in $HOSTNAMES; do
  echo "── $host"
  # 1. Existing DNS records at this hostname (Vercel A records today). Needs
  #    Zone:DNS:Read; without it we still proceed, since the attach call below
  #    asks Cloudflare to replace whatever is there.
  if records="$(cf "/zones/$ZONE_ID/dns_records?name=$host&per_page=50" 2>/dev/null)"; then
    echo "$records" | jq_py 'print("\n".join(f"  found {r[\"type\"]} {r[\"name\"]} → {r[\"content\"]} (proxied={r[\"proxied\"]}) id={r[\"id\"]}" for r in d["result"]) or "  no existing records")'
  else
    records=""
    echo "  (token cannot read DNS records; if any still exist the attach below fails with error 100117 — delete them in the dashboard)"
  fi
  # 2. Already attached?
  existing="$(cf "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains?hostname=$host" | jq_py 'print(len(d["result"]))')"
  if [ "$existing" != "0" ]; then echo "  ✓ already a custom domain of a Worker; nothing to do"; continue; fi
  if [ $APPLY = 0 ]; then echo "  would delete the records above and attach $host to $WORKER_NAME"; continue; fi
  # 2. Delete the externally managed records: Cloudflare refuses to attach a
  #    custom domain while any exist (error 100117), and override_existing_dns_record
  #    does not cover them. Needs Zone:DNS:Edit on the token.
  if [ -n "$records" ]; then
    for id in $(echo "$records" | jq_py 'print(" ".join(r["id"] for r in d["result"]))'); do
      cf "/zones/$ZONE_ID/dns_records/$id" -X DELETE >/dev/null && echo "  deleted record $id"
    done
  fi
  # 3. Attach; Cloudflare creates its own managed records and certificate.
  cf "/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains" -X PUT \
    --data "{\"hostname\":\"$host\",\"zone_id\":\"$ZONE_ID\",\"service\":\"$WORKER_NAME\",\"environment\":\"production\",\"override_existing_dns_record\":true}" \
    | jq_py 'print("  ✓ attached:", d["result"]["hostname"], "→", d["result"]["service"])'
done

[ $APPLY = 1 ] && echo "Done. Verify: curl -sI https://$ZONE_NAME/ | grep -i cf-ray   (should be present; 'server: cloudflare')"
exit 0
