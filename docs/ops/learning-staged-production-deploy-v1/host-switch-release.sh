#!/bin/bash
set -euo pipefail
REL="$(cat /tmp/umtuba-learning-rel.txt)"
RDIR="/opt/umtuba/production/releases/${REL}"
test -f "$RDIR/.next/BUILD_ID"
test -f "$RDIR/package.json"
test -f "$RDIR/app/learning/page.tsx"
PREV="$(readlink -f /opt/umtuba/production/current)"
echo "PREV=${PREV}"
echo "NEXT=${RDIR}"
ln -sfn "$RDIR" /opt/umtuba/production/current
test -L /opt/umtuba/production/current
echo "CURRENT=$(readlink -f /opt/umtuba/production/current)"
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
