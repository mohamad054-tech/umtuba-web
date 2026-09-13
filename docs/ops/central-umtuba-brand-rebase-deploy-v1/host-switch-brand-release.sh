#!/bin/bash
# Switch production current only after inline gate passed.
set -euo pipefail

REL="$(cat /tmp/umtuba-brand-rel.txt)"
RDIR="/opt/umtuba/production/releases/${REL}"
EXPECTED_SHA="b5fbeff29cb0f308481b38c06500c572cd44a9c4"

test -f "${RDIR}/.next/BUILD_ID"
test -f "${RDIR}/package.json"
test -f "${RDIR}/app/components/brand/UmtubaStackedLogo.tsx"
test "$(tr -d '[:space:]' < "${RDIR}/GIT_SHA")" = "${EXPECTED_SHA}"

CHUNKS="${RDIR}/.next/static/chunks"
if ! grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_URL:["'\'']https' "${CHUNKS}"; then
  echo "INLINE_GATE_FAILED_NO_SWITCH"
  exit 20
fi
if ! grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:["'\'']' "${CHUNKS}"; then
  echo "PUBLISHABLE_INLINE_GATE_FAILED_NO_SWITCH"
  exit 22
fi

PREV="$(readlink -f /opt/umtuba/production/current)"
echo "PREV=${PREV}"
echo "NEXT=${RDIR}"
ln -sfn "${RDIR}" /opt/umtuba/production/current
test -L /opt/umtuba/production/current
echo "CURRENT=$(readlink -f /opt/umtuba/production/current)"
echo "LIVE_SOURCE_SHA=$(cat /opt/umtuba/production/current/GIT_SHA)"
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
