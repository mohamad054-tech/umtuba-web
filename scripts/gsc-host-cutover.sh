#!/bin/bash
set -eu
REL=/opt/umtuba/production/releases/0431c65b-20260907123000
test -f "$REL/.next/BUILD_ID"
ln -sfn "$REL" /opt/umtuba/production/current
systemctl restart umtuba-production.service
sleep 2
systemctl is-active umtuba-production.service
readlink -f /opt/umtuba/production/current
cat "$REL/.next/BUILD_ID"
echo CUTOVER_OK
