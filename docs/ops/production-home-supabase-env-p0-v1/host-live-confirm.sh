#!/bin/bash
set -euo pipefail
echo "CURRENT=$(readlink -f /opt/umtuba/production/current)"
echo "LIVE_SHA=$(tr -d '[:space:]' < /opt/umtuba/production/current/GIT_SHA)"
echo "BUILD_ID=$(cat /opt/umtuba/production/current/.next/BUILD_ID)"
echo "SERVICE=$(systemctl is-active umtuba-production.service)"
