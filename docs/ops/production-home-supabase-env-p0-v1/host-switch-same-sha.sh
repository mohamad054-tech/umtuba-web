#!/bin/bash
# Switch current only after inlining already proven. Same-SHA only.
set -euo pipefail

EXPECTED_SHA="b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c"
REL="$(tr -d '[:space:]' < /tmp/umtuba-p0-rel.txt)"
RDIR="/opt/umtuba/production/releases/${REL}"
echo "REL=${REL}"
echo "NEXT=${RDIR}"

test -f "${RDIR}/.next/BUILD_ID"
test -f "${RDIR}/package.json"
test -f "${RDIR}/GIT_SHA"
NEW_SHA="$(tr -d '[:space:]' < "${RDIR}/GIT_SHA")"
echo "NEW_SHA=${NEW_SHA}"
test "${NEW_SHA}" = "${EXPECTED_SHA}"

CHUNKS="${RDIR}/.next/static/chunks"
if ! grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_URL:["'\'']https' "${CHUNKS}"; then
  echo "PRE_SWITCH_INLINE=NO"
  echo "STOP_NO_SWITCH"
  exit 20
fi
echo "PRE_SWITCH_INLINE=YES"

PREV="$(readlink -f /opt/umtuba/production/current)"
echo "PREV=${PREV}"
ln -sfn "${RDIR}" /opt/umtuba/production/current
test -L /opt/umtuba/production/current
echo "CURRENT=$(readlink -f /opt/umtuba/production/current)"
echo "LIVE_SHA=$(tr -d '[:space:]' < /opt/umtuba/production/current/GIT_SHA)"
echo "LIVE_BUILD_ID=$(cat /opt/umtuba/production/current/.next/BUILD_ID)"
systemctl restart umtuba-production.service
sleep 5
systemctl is-active umtuba-production.service
echo "SERVICE=$(systemctl is-active umtuba-production.service)"
curl -sS -o /tmp/umtuba-healthz-body.txt -w "HEALTHZ_HTTP=%{http_code}\n" https://umtuba.com/healthz
echo -n "HEALTHZ_BODY="
cat /tmp/umtuba-healthz-body.txt
echo
echo "ROLLBACK_TARGET=${PREV}"
echo "SWITCH=PASS"
