#!/bin/bash
set +e
echo "CURRENT_HTTPS_SUPABASE_HOST_FILE_COUNT=$(grep -Rl --include='*.js' -E 'https://[a-z0-9.-]+\.supabase\.co' /opt/umtuba/production/current/.next/static/chunks 2>/dev/null | wc -l)"
echo "PREVIOUS_RELEASE_COMPARE:"
for rel in /opt/umtuba/production/releases/*; do
  [ -d "$rel/.next/static/chunks" ] || continue
  name="$(basename "$rel")"
  sha="NO_GIT_SHA"
  [ -f "$rel/GIT_SHA" ] && sha="$(cat "$rel/GIT_SHA")"
  bid="NO_BUILD_ID"
  [ -f "$rel/.next/BUILD_ID" ] && bid="$(cat "$rel/.next/BUILD_ID")"
  grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_URL:["'\'']https' "$rel/.next/static/chunks" 2>/dev/null
  if [ $? -eq 0 ]; then inline=YES; else inline=NO; fi
  echo "REL=${name} SHA=${sha} BUILD_ID=${bid} INLINED_URL_ASSIGN=${inline}"
done
echo "PROC_NEXT_PUBLIC_NAMES:"
pid="$(systemctl show -p MainPID --value umtuba-production.service)"
echo "MAIN_PID=${pid}"
if [ -n "$pid" ] && [ "$pid" != "0" ]; then
  tr "\0" "\n" < /proc/$pid/environ 2>/dev/null | cut -d= -f1 | grep -E 'NEXT_PUBLIC_SUPABASE|SUPABASE' || echo "NO_SUPABASE_NAMES_IN_PROC"
fi
echo "B2C0_BUILD_LOG_PRESENT=$(ls /opt/umtuba/production/logs/npm-build-b2c0bbd* 2>/dev/null | wc -l)"
echo "CURRENT_HAS_DOTENV=$([ -f /opt/umtuba/production/current/.env ] && echo YES || echo NO)"
echo "CURRENT_HAS_DOTENV_LOCAL=$([ -f /opt/umtuba/production/current/.env.local ] && echo YES || echo NO)"
echo "CURRENT_HAS_DOTENV_PRODUCTION=$([ -f /opt/umtuba/production/current/.env.production ] && echo YES || echo NO)"
echo "CURRENT_HAS_DOTENV_PRODUCTION_LOCAL=$([ -f /opt/umtuba/production/current/.env.production.local ] && echo YES || echo NO)"
echo "DONE"
