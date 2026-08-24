#!/bin/bash
set -euo pipefail
REL="$(cat /tmp/umtuba-learning-rel.txt)"
RDIR="/opt/umtuba/production/releases/${REL}"
cd "$RDIR"
echo "REL=${REL}"
echo "CURRENT_BEFORE=$(readlink -f /opt/umtuba/production/current)"
unset NODE_ENV || true
export npm_config_production=false
echo "STEP=npm_ci"
npm ci --include=dev > "/opt/umtuba/production/logs/npm-ci-${REL}.log" 2>&1
if [ ! -d node_modules/@tailwindcss/postcss ]; then
  echo TAILWIND_MISSING
  exit 3
fi
echo INSTALL=PASS
echo "STEP=npm_build"
set +x
set -a
# shellcheck disable=SC1091
. /etc/umtuba/production/umtuba.env
set +a
export NODE_ENV=production
npm run build > "/opt/umtuba/production/logs/npm-build-${REL}.log" 2>&1
test -f .next/BUILD_ID
echo BUILD=PASS
echo "BUILD_ID=$(cat .next/BUILD_ID)"
echo "MIGRATION_20260934_APPLIED=NO"
