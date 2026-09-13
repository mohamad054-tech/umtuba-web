# DESKTOP_UMTUBA_LEARNING_STAGED_PRODUCTION_DEPLOYMENT_V1

```
TASK_ID = DESKTOP_UMTUBA_LEARNING_STAGED_PRODUCTION_DEPLOYMENT_V1
STATUS = COMPLETE
DATE = 2026-08-24
MACHINE = DESKTOP
OWNER_DECISION = APPROVED_TO_DEPLOY_PRODUCTIZED_LEARNING
ACCEPTED_LEARNING_SHA = a29a329ddf21c4aa2b7d55887b2b276a12447892
DEPLOYMENT_SOURCE_SHA = a29a329ddf21c4aa2b7d55887b2b276a12447892
PRODUCTION_BASE_SHA = cfc57402e38423231092d9eb80244b333c4cf6a7
PRODUCTION_BASE_REF = origin/alpha-0.2
LIVE_PRODUCTION_BEFORE = /opt/umtuba/production/releases/cfc57402-20260822184650
LIVE_PRODUCTION_AFTER = /opt/umtuba/production/releases/a29a329d-20260824111302
BUILD_ID = seZg_Z9XGfu6Eu3Vd8g7B
WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-STAGED-PRODUCTION-DEPLOY-V1
BRANCH = desktop/learning-staged-production-deploy-v1
PUSHED = YES
DEPLOYED = YES
LIVE_LEARNING_URL = https://umtuba.com/learning
ROLLBACK_TARGET = /opt/umtuba/production/releases/cfc57402-20260822184650
NEW_MIGRATION = NO
MIGRATION_20260934_APPLIED = NO
FAKE_COURSE_CREATED = NO
FAKE_ENROLLMENT_CREATED = NO
MOBILE_NATIVE_TOUCHED = NO
```

This is a controlled production deploy of the accepted Learning productization. It is not a redesign.

## Reconciliation

`git fetch --prune` on 2026-08-24.

| Source | SHA | Notes |
| --- | --- | --- |
| Live production | `cfc57402` | Host current `cfc57402-20260822184650` |
| `origin/alpha-0.2` | `cfc57402e38423231092d9eb80244b333c4cf6a7` | Same as live |
| Accepted Learning | `a29a329ddf21c4aa2b7d55887b2b276a12447892` | Single parent = `cfc57402` |
| Newer Central store tip | `1f79dcba` `origin/central/store-seller-approval-admin-v1` | 1 commit ahead of alpha; **not live**; not included (unrelated Store change) |

No merge conflict. No rebase required. Isolated branch `desktop/learning-staged-production-deploy-v1` points at the accepted SHA. Dirty parent `office/profile-hero-completeness-v1` @ `380a366` was not used as merge target and was not committed.

`RECONCILIATION = FAST_FORWARD_IDENTICAL`  
`DEPLOYMENT_SOURCE_SHA = ACCEPTED_LEARNING_SHA`

## Pre-deploy gates (isolated worktree)

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| Targeted Learning vitest | PASS 25 |
| `npm run build` | PASS (Next 16.2.11). Learning routes in production table |
| Local `next start :3021` | PASS — `/learning`, catalog, `ja-01` visual+live; teacher write routes login-gated |

## Deploy path

Existing Hetzner production path (not Vercel; no new pipeline):

1. Push isolated branch so the SHA is on origin (same pattern as prior Central release SHAs).
2. `git archive` of `a29a329` → `/opt/umtuba/production/releases/a29a329d-20260824111302`.
3. Host analog of `/opt/umtuba/staging/logs/build-release.sh`: `npm ci --include=dev`, `npm run build` with `/etc/umtuba/production/umtuba.env` sourced (values never printed).
4. `ln -sfn` current; `systemctl restart umtuba-production.service`.
5. `https://umtuba.com/healthz` → `200 umtuba-production-ok`.
6. Previous release kept for symlink rollback.

`.env.local` was not shipped. `20260934` SQL is in the tree and was **not** applied.

## Live production QA

Fresh Playwright shots: `docs/ops/learning-staged-production-deploy-v1/screenshots/` (also copied under umtuba-web `docs/ops/...`). Not localhost. Not yesterday's shots.

| Check | Result |
| --- | --- |
| Learning route | PASS `https://umtuba.com/learning` 200, `learning-visual-root`, live catalog banner, guest Discover home |
| Owner-approved design | YES — dark chrome, pills, hero, recommended grid |
| Course discovery | PASS catalog + `ja-01` real public course, 16 lessons listed |
| Lesson page | AUTH_REQUIRED — guest `/learning/lessons/:id` → `/login?next=...`. Course page lesson nav is live. No fake login. |
| My Learning | PASS guest surface on Learning chrome (`My Learning` / `My library` pills). Empty guest library is production-safe. |
| Teacher profile | ROUTE_CONNECTED `/learning/teachers/[userId]`. No public teacher id on `ja-01` HTML. Missing id did not 500. |
| Become a Teacher | NOT_AUTHORIZED dedicated route → login. In-app pill present on Learning home. |
| Teacher Center | NOT_AUTHORIZED → `/login?next=/learning/teacher` |
| Course Builder | NOT_AUTHORIZED → `/login?next=/learning/teacher` |
| Real public data | YES — live banner; `JA-01 — AI Foundations for Builders` |
| Arabic RTL | PASS `lang=ar dir=rtl` desktop + mobile |
| LTR | PASS `lang=en dir=ltr` |
| Desktop responsive | PASS 1440 |
| Mobile-web responsive | PASS 390 + bottom nav |
| Auth/session | PRESERVED guest + Sign in. Auth gates intact. |
| Unrelated areas | Home 200, Store 200 (shared nav includes Learning). `/discover` resolved to `/`. `/feed` 404 is not in this app route table (pre-existing vs `cfc5740` base). |
| healthz | PASS |

## Security

- No secrets printed. Production env sourced on host only.
- No RLS/auth change to make tests pass.
- No fake courses, enrollments, teacher records, or payments.
- Parent dirt not pushed.
- `_port_extract` not touched. Windows Desktop not used as artifact destination.
- `umtuba-mobile` not touched.

## Rollback

```text
ln -sfn /opt/umtuba/production/releases/cfc57402-20260822184650 /opt/umtuba/production/current
systemctl restart umtuba-production.service
```
