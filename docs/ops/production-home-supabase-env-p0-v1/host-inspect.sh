#!/bin/bash
# Read-only production inspect. Prints KEY NAMES and presence flags only. Never dumps values.
set -euo pipefail

echo "HOSTNAME=$(hostname)"
echo "CURRENT=$(readlink -f /opt/umtuba/production/current)"
if [ -f /opt/umtuba/production/current/GIT_SHA ]; then
  echo "GIT_SHA=$(cat /opt/umtuba/production/current/GIT_SHA)"
fi
if [ -f /opt/umtuba/production/current/.next/BUILD_ID ]; then
  echo "BUILD_ID=$(cat /opt/umtuba/production/current/.next/BUILD_ID)"
fi

echo "RELEASE_DIRS:"
ls -1 /opt/umtuba/production/releases | tail -n 20

echo "BUILD_LOGS:"
ls -1 /opt/umtuba/production/logs 2>/dev/null | grep -E 'npm-build|b2c0bbd' || echo "NO_MATCHING_BUILD_LOGS"

echo "SYSTEMD_ENV_FILE_LINE:"
systemctl cat umtuba-production.service | grep -E 'EnvironmentFile|WorkingDirectory|ExecStart' || true

ENV_FILE="/etc/umtuba/production/umtuba.env"
echo "ENV_FILE_EXISTS=$([ -f "$ENV_FILE" ] && echo YES || echo NO)"
echo "ENV_FILE_MODE=$(stat -c '%a' "$ENV_FILE" 2>/dev/null || echo MISSING)"

echo "ENV_KEY_NAMES:"
# names only
grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | cut -d= -f1 | sort

for key in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; do
  if grep -q "^${key}=" "$ENV_FILE"; then
    # presence/non-empty only — never print the value
    val_len="$(awk -F= -v k="$key" '$1==k {print length($2)}' "$ENV_FILE" | head -n1)"
    echo "${key}_NAME_PRESENT=YES"
    echo "${key}_NONEMPTY=$([ "${val_len:-0}" -gt 0 ] && echo YES || echo NO)"
    echo "${key}_VALUE_LEN_BUCKET=$([ "${val_len:-0}" -ge 20 ] && echo GE20 || echo LT20)"
  else
    echo "${key}_NAME_PRESENT=NO"
    echo "${key}_NONEMPTY=NO"
  fi
done

echo "LIVE_CHUNK_INLINE_CURRENT:"
# Search current client chunks for inlined assignment vs runtime process.env shape.
# Do not print matching lines (they may contain values).
CUR_CHUNKS="/opt/umtuba/production/current/.next/static/chunks"
if [ -d "$CUR_CHUNKS" ]; then
  if grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_URL:["'\'']https' "$CUR_CHUNKS"; then
    echo "CURRENT_INLINED_URL_ASSIGN=YES"
  else
    echo "CURRENT_INLINED_URL_ASSIGN=NO"
  fi
  if grep -Rql --include='*.js' 'Supabase URL is not configured' "$CUR_CHUNKS"; then
    echo "CURRENT_HAS_MISSING_URL_MESSAGE=YES"
  else
    echo "CURRENT_HAS_MISSING_URL_MESSAGE=NO"
  fi
  HTTPS_HOST_FILES="$(grep -Rl --include='*.js' -E 'https://[a-z0-9.-]+\.supabase\.co' "$CUR_CHUNKS" | wc -l)"
  echo "CURRENT_HTTPS_SUPABASE_HOST_FILE_COUNT=${HTTPS_HOST_FILES}"
else
  echo "CURRENT_CHUNKS_MISSING=YES"
fi

echo "PREVIOUS_RELEASE_COMPARE:"
for rel in /opt/umtuba/production/releases/*; do
  [ -d "$rel/.next/static/chunks" ] || continue
  name="$(basename "$rel")"
  sha="NO_GIT_SHA"
  [ -f "$rel/GIT_SHA" ] && sha="$(cat "$rel/GIT_SHA")"
  bid="NO_BUILD_ID"
  [ -f "$rel/.next/BUILD_ID" ] && bid="$(cat "$rel/.next/BUILD_ID")"
  if grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_URL:["'\'']https' "$rel/.next/static/chunks"; then
    inline="YES"
  else
    inline="NO"
  fi
  echo "REL=${name} SHA=${sha} BUILD_ID=${bid} INLINED_URL_ASSIGN=${inline}"
done
