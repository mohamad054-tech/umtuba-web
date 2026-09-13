# CENTRAL_DEPLOY_OWNER_APPROVED_UMTUBA_BRAND_REBASE_V1

```
TASK_ID = CENTRAL_DEPLOY_OWNER_APPROVED_UMTUBA_BRAND_REBASE_V1
STATUS = COMPLETE
SOURCE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
SOURCE_SHA_VERIFIED = YES
BASE_SHA_VERIFIED = YES
BRAND_ONLY_DIFF_VERIFIED = YES
PRODUCTION_PUBLIC_ENV_PRESENT_AT_BUILD = YES
NEXT_PUBLIC_SUPABASE_URL_PRESENT = YES
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_PRESENT = YES
NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT = NO
INLINED_URL_ASSIGN = YES
HTTPS_SUPABASE_HOST_IN_CHUNKS = YES
INLINED_PUBLISHABLE_KEY_ASSIGN = YES
BUILD = PASS
BUILD_ID = hygi-ODkpCIc0YibGtTQT
PRODUCTION_DEPLOYED = YES
LIVE_RELEASE = /opt/umtuba/production/releases/b5fbeff2-20260829075848
LIVE_SOURCE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
ROLLBACK_TARGET = /opt/umtuba/production/releases/b2c0bbd1-20260829074010
HOME_SMOKE = PASS
WELCOME_SMOKE = PASS
WATCH_SMOKE = PASS
LEARNING_SMOKE = PASS
STORE_SMOKE = PASS
NEXT_ERROR_GONE = YES
LOGO_LIVE = YES
STACKED_WELCOME_LOGO_LIVE = YES
ALPHA_0_2_REMOVED_LIVE = YES
JOIN_BETA_REMOVED_LIVE = YES
FAVICON_PWA_LIVE = YES
GLOBE_CHANGED = NO
POST_VIDEO_BEHAVIOR_CHANGED = NO
LEARNING_FUNCTIONALITY_CHANGED = NO
STORE_FUNCTIONALITY_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
ORIGIN_ALPHA_FAST_FORWARDED = NO
ISOLATED_BRANCH_PUSHED = NO
PARENT_PRESERVED = office/profile-hero-completeness-v1 @ 380a366
BLOCKERS = NONE
```

## What shipped

Owner-approved brand-only rebase `b5fbeff` is live. It is a fast-forward descendant of the P0 recovery source `b2c0bbd`. Three brand commits only: official stacked logo, approved-video chrome correction, Welcome Alpha 0.2 / Join Beta removal.

## Pre-deploy gates

1. Worktree `central/umtuba-brand-rebase-safety-v1` HEAD = `b5fbeff29cb0f308481b38c06500c572cd44a9c4`.
2. `git merge-base --is-ancestor b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c b5fbeff29cb0f308481b38c06500c572cd44a9c4` → YES.
3. `git diff --stat b2c0bbd...b5fbeff` = brand chrome/assets/metadata/welcome/nav/favicon/PWA + brand docs only. No Globe product logic, Learning/Store/payments/migrations, posts/videos, or `f455d90`.
4. `origin/alpha-0.2` still `b2c0bbd` after `git fetch --prune`. DEVELOPMENT_WORKFLOW.md does not require merging onto alpha first. Isolated branch was **not** pushed. Dirty parent was **not** reset/cleaned/stashed.

## Build / switch

Hetzner production path (not Vercel). Same env-source-before-build + client-chunk inlining proof as P0 `OPERATOR_SAME_SHA_ENV_REBUILD.md`.

1. `git archive` of exact SHA `b5fbeff` transferred to host (brand worktree history not modified).
2. New immutable release `/opt/umtuba/production/releases/b5fbeff2-20260829075848`.
3. `npm ci --include=dev` PASS.
4. Sourced `/etc/umtuba/production/umtuba.env` **before** `npm run build`. Values never printed. URL PRESENT=YES. PUBLISHABLE_KEY PRESENT=YES. ANON_KEY PRESENT=NO (not invented).
5. `npm run build` PASS. `BUILD_ID=hygi-ODkpCIc0YibGtTQT`.
6. Pre-switch inline gate: `INLINED_URL_ASSIGN=YES`, `HTTPS_SUPABASE_HOST_IN_CHUNKS=YES`, `INLINED_PUBLISHABLE_KEY_ASSIGN=YES`.
7. `ln -sfn` + `systemctl restart umtuba-production.service`. `https://umtuba.com/healthz` → `200 umtuba-production-ok`.

Logs: `/opt/umtuba/production/logs/npm-ci-b5fbeff2-20260829075848.log`, `npm-build-b5fbeff2-20260829075848.log`.

## Live smoke (2026-08-29)

Playwright against live HTTPS. Screenshots: `screenshots-live/`. JSON: `post-deploy-smoke.json`.

| Surface | Result |
| --- | --- |
| `/` and `/?hl=en` | Home feed stays after ~5.5s hydration. No `__next_error__`. No `Supabase URL is not configured.` DiscoverActionRail does not throw. Header gold U symbol live. |
| `/welcome` | Official stacked lockup: U above UMTUBA, LEARN · CREATE · SHARE. Alpha 0.2 gone. Join Beta gone. Globe still present (unchanged). |
| `/watch` | 200, video surface reachable. Pre-existing minified React #418 hydration warning (same class as P0). No Supabase throw. |
| `/learning` | 200, live catalog (JA-01). Header symbol live. Product routes unchanged. |
| `/store` | 200, Shop UMTUBA + seller CTA. Header symbol live. Product/payments unchanged. |
| Favicon / PWA | `favicon.ico`, `favicon-16/32`, `/brand/umtuba_icon_192|180|512`, `manifest.webmanifest` 200. Title `UMTUBA — Ideas Without Borders`. |

## Rollback

```text
ln -sfn /opt/umtuba/production/releases/b2c0bbd1-20260829074010 /opt/umtuba/production/current
systemctl restart umtuba-production.service
```

Previous P0 rollback `b2c0bbd1-20260825100900` remains on disk.

## Safety

- No commit. No push. No force. No parent reset.
- No DB / migrations / Stripe / credential rotation.
- Env values not printed. `_port_extract` not touched. Windows Desktop not used as artifact destination.
- Globe / posts / videos / Learning / Store / auth product logic not changed (brand chrome only).
