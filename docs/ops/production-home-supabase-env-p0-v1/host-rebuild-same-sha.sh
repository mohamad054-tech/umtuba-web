#!/bin/bash
# Same-SHA production rebuild. Does NOT switch current.
# Never prints env values. Never rotates credentials.
set -euo pipefail

EXPECTED_SHA="b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c"
SRC="/opt/umtuba/production/releases/b2c0bbd1-20260825100900"
CURRENT="$(readlink -f /opt/umtuba/production/current)"
echo "CURRENT_BEFORE=${CURRENT}"

test -f "${SRC}/GIT_SHA"
SRC_SHA="$(tr -d '[:space:]' < "${SRC}/GIT_SHA")"
echo "SRC_SHA=${SRC_SHA}"
if [ "${SRC_SHA}" != "${EXPECTED_SHA}" ]; then
  echo "SOURCE_SHA_VERIFIED=NO"
  exit 10
fi
echo "SOURCE_SHA_VERIFIED=YES"

if [ "${CURRENT}" != "${SRC}" ]; then
  echo "CURRENT_NOT_EXPECTED_SRC"
  exit 11
fi

STAMP="$(date -u +%Y%m%d%H%M%S)"
REL="b2c0bbd1-${STAMP}"
RDIR="/opt/umtuba/production/releases/${REL}"
echo "REL=${REL}"
echo "${REL}" > /tmp/umtuba-p0-rel.txt

mkdir -p /opt/umtuba/production/logs
mkdir -p "${RDIR}"

echo "STEP=copy_source_exclude_next"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude='.next' "${SRC}/" "${RDIR}/"
else
  cp -a "${SRC}/." "${RDIR}/"
  rm -rf "${RDIR}/.next"
fi
printf '%s\n' "${EXPECTED_SHA}" > "${RDIR}/GIT_SHA"
test "$(tr -d '[:space:]' < "${RDIR}/GIT_SHA")" = "${EXPECTED_SHA}"
test -f "${RDIR}/package.json"
test -f "${RDIR}/lib/env/supabasePublic.ts"
test ! -d "${RDIR}/.next"
echo "COPY=PASS"

cd "${RDIR}"
unset NODE_ENV || true
export npm_config_production=false
echo "STEP=npm_ci"
npm ci --include=dev > "/opt/umtuba/production/logs/npm-ci-${REL}.log" 2>&1
if [ ! -d node_modules/@tailwindcss/postcss ]; then
  echo TAILWIND_MISSING
  exit 3
fi
echo INSTALL=PASS

echo "STEP=env_presence"
set +x
set -a
# shellcheck disable=SC1091
. /etc/umtuba/production/umtuba.env
set +a
if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "NEXT_PUBLIC_SUPABASE_URL_PRESENT=YES"
else
  echo "NEXT_PUBLIC_SUPABASE_URL_PRESENT=NO"
  exit 12
fi
if [ -n "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_PRESENT=YES"
else
  echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_PRESENT=NO"
  exit 13
fi
if [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT=YES"
else
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT=NO"
fi
echo "PRODUCTION_PUBLIC_ENV_PRESENT_AT_BUILD=YES"

export NODE_ENV=production
echo "STEP=npm_build"
npm run build > "/opt/umtuba/production/logs/npm-build-${REL}.log" 2>&1
test -f .next/BUILD_ID
echo BUILD=PASS
echo "BUILD_ID=$(cat .next/BUILD_ID)"

echo "STEP=inline_gate"
CHUNKS="${RDIR}/.next/static/chunks"
if grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_URL:["'\'']https' "${CHUNKS}"; then
  echo "INLINED_URL_ASSIGN=YES"
else
  echo "INLINED_URL_ASSIGN=NO"
  echo "PUBLIC_URL_INLINED_IN_CLIENT_BUNDLE=NO"
  echo "STOP_NO_SWITCH"
  exit 20
fi
if grep -Rql --include='*.js' -E 'https://[a-z0-9.-]+\.supabase\.co' "${CHUNKS}"; then
  echo "HTTPS_SUPABASE_HOST_IN_CHUNKS=YES"
else
  echo "HTTPS_SUPABASE_HOST_IN_CHUNKS=NO"
  echo "PUBLIC_URL_INLINED_IN_CLIENT_BUNDLE=NO"
  echo "STOP_NO_SWITCH"
  exit 21
fi
if grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:["'\'']' "${CHUNKS}"; then
  echo "INLINED_PUBLISHABLE_KEY_ASSIGN=YES"
else
  echo "INLINED_PUBLISHABLE_KEY_ASSIGN=NO"
fi
echo "PUBLIC_URL_INLINED_IN_CLIENT_BUNDLE=YES"
echo "READY_TO_SWITCH=YES"
echo "ROLLBACK_TARGET=${SRC}"
echo "MIGRATION_20260934_APPLIED=NO"
