# Operator steps — same-SHA production rebuild with public env

**EXECUTED 2026-08-29 by DESKTOP_UMTUBA_PRODUCTION_HOME_SUPABASE_ENV_P0_RELEASE_V1.** Live release `b2c0bbd1-20260829074010`. Rollback remains `b2c0bbd1-20260825100900`.

Target: rebuild live source `b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c` into a **new** release directory so `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present at `npm run build` and inlined into client chunks.

Do **not** rotate credentials. Do **not** add `NEXT_PUBLIC_SUPABASE_ANON_KEY` unless Central wants the optional alias; the host already has the canonical `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do **not** switch `current` to unused `a1dc8fe3-20260825122639`. Do **not** touch brand candidate `b5fbeff`.

## Preconditions

- Keep `/opt/umtuba/production/releases/b2c0bbd1-20260825100900` as rollback.
- Confirm `readlink -f /opt/umtuba/production/current` is still that directory.
- Confirm `/etc/umtuba/production/umtuba.env` mode `600` still contains key **names** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (do not print values).
- Work from a new directory: `/opt/umtuba/production/releases/b2c0bbd1-<new-timestamp>`.

## Build (host)

Use the existing analog (`docs/ops/learning-staged-production-deploy-v1/host-build-release.sh`):

1. Create the new release tree from exact SHA `b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c` (`git archive` or equivalent). Write `GIT_SHA` to that file only.
2. `cd` into the new release. `unset NODE_ENV` / `export npm_config_production=false`.
3. `npm ci --include=dev` → log `/opt/umtuba/production/logs/npm-ci-b2c0bbd1-<timestamp>.log`.
4. **Required:** source production env **before** `next build` (names only; never `cat` the file):

```bash
set +x
set -a
# shellcheck disable=SC1091
. /etc/umtuba/production/umtuba.env
set +a
export NODE_ENV=production
```

5. `npm run build` → log `/opt/umtuba/production/logs/npm-build-b2c0bbd1-<timestamp>.log`.
6. `test -f .next/BUILD_ID`.

## Verify inlining before switch (do not print values)

From the **new** release, not yet `current`:

```bash
CHUNKS="<new-release>/.next/static/chunks"
grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_URL:["'\'']https' "$CHUNKS"
# expect exit 0 → INLINED_URL_ASSIGN=YES

# optional presence flags only
grep -Rql --include='*.js' 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:["'\'']' "$CHUNKS"
# expect YES

# fail the GO if still NO
```

If `INLINED_URL_ASSIGN` is still `NO`, **do not switch `current`**. Stop and report. Do not paper over with `tryCreateClient`.

## Switch (only after inlining YES)

```bash
PREV="$(readlink -f /opt/umtuba/production/current)"
ln -sfn "<new-release>" /opt/umtuba/production/current
systemctl restart umtuba-production.service
```

Probe:

- `https://umtuba.com/healthz` → `200 umtuba-production-ok`
- `https://umtuba.com/` and `/?hl=en` and `/?hl=ar` → Home stays up; no `Supabase URL is not configured.`
- `https://umtuba.com/welcome` still up

## Rollback

```bash
ln -sfn /opt/umtuba/production/releases/b2c0bbd1-20260825100900 /opt/umtuba/production/current
systemctl restart umtuba-production.service
```
