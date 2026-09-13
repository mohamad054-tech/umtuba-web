#!/bin/bash
set +e
REL=/opt/umtuba/production/releases/b2c0bbd1-20260825100900
echo "B2C0_LS_TOP:"
ls -1 "$REL" | head -n 40
echo "B2C0_NEXT_EXISTS=$([ -d "$REL/.next" ] && echo YES || echo NO)"
echo "B2C0_NODE_MODULES=$([ -d "$REL/node_modules" ] && echo YES || echo NO)"
echo "UNUSED_A1DC_SHA_FILE=$([ -f /opt/umtuba/production/releases/a1dc8fe3-20260825122639/GIT_SHA ] && echo YES || echo NO)"
if [ -f /opt/umtuba/production/releases/a1dc8fe3-20260825122639/GIT_SHA ]; then
  echo "UNUSED_A1DC_SHA_LEN=$(wc -c < /opt/umtuba/production/releases/a1dc8fe3-20260825122639/GIT_SHA)"
fi
echo "UNUSED_A1DC_IS_CURRENT=$( [ "$(readlink -f /opt/umtuba/production/current)" = "/opt/umtuba/production/releases/a1dc8fe3-20260825122639" ] && echo YES || echo NO )"
echo "DB1B_INLINED_COMPARE_ALREADY=YES"
echo "DONE"
