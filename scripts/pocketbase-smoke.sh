#!/usr/bin/env bash
# Smoke-tests the vaults migration + server hooks against a running PocketBase
# (default: the local instance from `npm run dev:pb`). Signs up a throwaway
# user, then checks: snapshot on create, 409 on a stale expectedUpdated,
# snapshot on document update (with vault_updated), no snapshot on a public
# toggle, anonymous read only while public, snapshot creates rejected, and
# cascade delete. Usage: scripts/pocketbase-smoke.sh [base-url]
set -uo pipefail
BASE="${1:-http://127.0.0.1:8090}"
EMAIL="hooktest-$RANDOM@example.com"
PASS="hooktest-password-123"
fail() { echo "FAIL: $*" >&2; exit 1; }
j() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }

echo "# health"; curl -fsS "$BASE/api/health" >/dev/null || fail "pocketbase not reachable at $BASE"

echo "# sign up + auth"
curl -fsS -X POST "$BASE/api/collections/users/records" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"passwordConfirm\":\"$PASS\"}" >/dev/null || fail "signup"
AUTH=$(curl -fsS -X POST "$BASE/api/collections/users/auth-with-password" -H 'content-type: application/json' \
  -d "{\"identity\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$AUTH" | j "['token']"); USER=$(echo "$AUTH" | j "['record']['id']")
H=(-H "Authorization: $TOKEN" -H 'content-type: application/json')

DOC1='{"app":"myregulars","schemaVersion":2,"id":"v-test","name":"Hook Test","updatedAt":"2026-01-01T00:00:00.000Z","data":{"locations":[]}}'
echo "# create vault"
CREATED=$(curl -fsS -X POST "$BASE/api/collections/vaults/records" "${H[@]}" \
  -d "{\"owner\":\"$USER\",\"name\":\"Hook Test\",\"document\":$DOC1}") || fail "create vault"
VID=$(echo "$CREATED" | j "['id']"); UPD1=$(echo "$CREATED" | j "['updated']")
echo "  vault=$VID updated=$UPD1"

snapcount() { curl -fsS "$BASE/api/collections/vault_snapshots/records?filter=vault%3D%27$VID%27" "${H[@]}" | j "['totalItems']"; }
[ "$(snapcount)" = "1" ] || fail "expected 1 snapshot after create, got $(snapcount)"
echo "  ok: 1 snapshot after create"

echo "# stale expectedUpdated -> 409"
CODE=$(curl -s -o /tmp/pb-409.json -w '%{http_code}' -X PATCH "$BASE/api/collections/vaults/records/$VID" "${H[@]}" \
  -d "{\"document\":$DOC1,\"expectedUpdated\":\"1999-01-01 00:00:00.000Z\"}")
[ "$CODE" = "409" ] || { cat /tmp/pb-409.json; fail "expected 409, got $CODE"; }
echo "  ok: 409"
[ "$(snapcount)" = "1" ] || fail "409 must not snapshot"

echo "# matching expectedUpdated + new document -> 200 + snapshot"
DOC2='{"app":"myregulars","schemaVersion":2,"id":"v-test","name":"Hook Test 2","updatedAt":"2026-01-02T00:00:00.000Z","data":{"locations":[]}}'
UPDATED=$(curl -fsS -X PATCH "$BASE/api/collections/vaults/records/$VID" "${H[@]}" \
  -d "{\"name\":\"Hook Test 2\",\"document\":$DOC2,\"expectedUpdated\":\"$UPD1\"}") || fail "conditional update"
UPD2=$(echo "$UPDATED" | j "['updated']")
[ "$(snapcount)" = "2" ] || fail "expected 2 snapshots, got $(snapcount)"
LATEST=$(curl -fsS "$BASE/api/collections/vault_snapshots/records?filter=vault%3D%27$VID%27&sort=-created&perPage=1" "${H[@]}")
VU=$(echo "$LATEST" | j "['items'][0]['vault_updated']")
[ "$VU" = "$UPD2" ] || fail "vault_updated '$VU' != vault.updated '$UPD2'"
echo "  ok: snapshot.vault_updated matches vault.updated ($UPD2)"

echo "# public toggle alone -> no snapshot"
curl -fsS -X PATCH "$BASE/api/collections/vaults/records/$VID" "${H[@]}" -d '{"public":true}' >/dev/null || fail "public toggle"
[ "$(snapcount)" = "2" ] || fail "public toggle must not snapshot"
echo "  ok"

echo "# anonymous read of a public vault -> 200; after unpublish -> 404"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/collections/vaults/records/$VID")
[ "$CODE" = "200" ] || fail "anon read of public vault got $CODE"
ANON_SNAPS=$(curl -s "$BASE/api/collections/vault_snapshots/records?filter=vault%3D%27$VID%27" | j "['totalItems']")
[ "$ANON_SNAPS" = "2" ] || fail "anon snapshot list of public vault got $ANON_SNAPS"
curl -fsS -X PATCH "$BASE/api/collections/vaults/records/$VID" "${H[@]}" -d '{"public":false}' >/dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/collections/vaults/records/$VID")
[ "$CODE" = "404" ] || fail "anon read of private vault got $CODE"
echo "  ok"

echo "# clients cannot create snapshots"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/collections/vault_snapshots/records" "${H[@]}" \
  -d "{\"vault\":\"$VID\",\"owner\":\"$USER\",\"document\":$DOC1}")
case "$CODE" in 400|403) echo "  ok: $CODE";; *) fail "snapshot create got $CODE";; esac

echo "# delete vault cascades snapshots"
curl -fsS -X DELETE "$BASE/api/collections/vaults/records/$VID" "${H[@]}" >/dev/null || fail "delete"
[ "$(snapcount)" = "0" ] || fail "snapshots not cascaded"
echo "  ok"
echo "ALL PASSED"
