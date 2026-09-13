# CURSOR_REPORT — CENTRAL_SYNC_OFFICIAL_GIT_REF_TO_LIVE_BRAND_RELEASE_V1

## Summary

Owner-authorized fast-forward of `origin/alpha-0.2` from `b2c0bbd` to live brand SHA `b5fbeff`. All pre-push gates passed. Push used exact SHA refspec with no force. Production was not redeployed or restarted. Live `healthz` 200 and `/welcome` 200 still serve the existing `b5fbeff` release (`BUILD_ID=hygi-ODkpCIc0YibGtTQT`). Dirty parent `office/profile-hero-completeness-v1` @ `380a366` untouched.

```text
TASK_ID = CENTRAL_SYNC_OFFICIAL_GIT_REF_TO_LIVE_BRAND_RELEASE_V1
STATUS = COMPLETE
PREVIOUS_REMOTE_ALPHA_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
TARGET_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
FAST_FORWARD_VERIFIED = YES
BRAND_ONLY_SCOPE_REVERIFIED = YES
REMOTE_CHANGED_SINCE_GATE = NO
PUSHED = YES
FORCE_PUSH_USED = NO
FINAL_ORIGIN_ALPHA_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
PRODUCTION_DEPLOYED = NO
PRODUCTION_RESTARTED = NO
LIVE_SOURCE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
LIVE_HEALTH = PASS
ORIGINAL_DIRTY_CHECKOUT_PRESERVED = YES
BLOCKERS = NONE
NOTES = Push was `git push origin b5fbeff…:refs/heads/alpha-0.2` → remote `b2c0bbd..b5fbeff`. Live healthz `200 umtuba-production-ok`. Welcome 200, stacked logo present, Alpha 0.2 / Join Beta absent. No new git commit.
```

## Exact files changed

Docs only in the brand worktree (uncommitted; no new commit):

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md` (this packet)
- `docs/ops/central-umtuba-brand-rebase-deploy-v1/OFFICIAL_GIT_REF_SYNC_V1.md`

No product/runtime files changed. No new git objects created for this GO.

## Migrations created

None.

## Security review

- Fast-forward only. No `--force` / `--force-with-lease` / `-f`.
- Remote rejected-if-not-FF path not needed; GitHub accepted FF.
- No secrets / `.env` printed. No SSH, no host restart, no deploy.
- Parent dirty tree not reset, stashed, or checked out. `_port_extract` not touched. Windows Desktop not used as artifact destination.

## Tests

Not re-run. Brand-only range re-verified via `git log` (3 commits) and `git diff --stat b2c0bbd...b5fbeff`.

Live read-only: `https://umtuba.com/healthz` → `200 umtuba-production-ok`. `https://umtuba.com/welcome` → `200` with prior brand `BUILD_ID`.

## TypeScript

Not re-run this GO (git-ref sync only).

## Build

Not rebuilt. Production still serves host build `hygi-ODkpCIc0YibGtTQT` from the earlier `b5fbeff` release.

## git diff --check

Not applicable for a refspec push. Range `b2c0bbd...b5fbeff` was already brand-only at rebase/deploy.

## git status --short

Brand worktree `central/umtuba-brand-rebase-safety-v1` @ `b5fbeff` plus uncommitted docs (`CURRENT_TASK`, `CURSOR_REPORT`, `docs/ops/central-umtuba-brand-rebase-deploy-v1/`). Isolated branch itself was not required to be pushed; the SHA was pushed to `alpha-0.2`.

Parent remains `office/profile-hero-completeness-v1` @ `380a366` dirty.

## Open issues

- Isolated local branch `central/umtuba-brand-rebase-safety-v1` may still lack an upstream; official integration ref is now `origin/alpha-0.2` @ `b5fbeff`.
- Watch minified React #418 remains pre-existing (P0). Not touched.

---

# PRIOR — CENTRAL_DEPLOY_OWNER_APPROVED_UMTUBA_BRAND_REBASE_V1

## Summary

Owner-authorized production deploy of exact brand SHA `b5fbeff29cb0f308481b38c06500c572cd44a9c4`. Fast-forward descendant of live P0 source `b2c0bbd`. Brand-only diff verified. Host build sourced `/etc/umtuba/production/umtuba.env` before `next build`. Client-chunk URL + publishable-key inlining proven **before** switch. Live current is `/opt/umtuba/production/releases/b5fbeff2-20260829075848`. Home stays after hydration. Welcome stacked logo live. Alpha 0.2 / Join Beta gone. Watch / Learning / Store reachable. Parent `office/profile-hero-completeness-v1` @ `380a366` untouched. Isolated branch not pushed. `origin/alpha-0.2` was left at `b2c0bbd` until the sync GO above.

```text
TASK_ID = CENTRAL_DEPLOY_OWNER_APPROVED_UMTUBA_BRAND_REBASE_V1
STATUS = COMPLETE
SOURCE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
SOURCE_SHA_VERIFIED = YES
BASE_SHA_VERIFIED = YES
BRAND_ONLY_DIFF_VERIFIED = YES
PRODUCTION_PUBLIC_ENV_PRESENT_AT_BUILD = YES
BUILD = PASS
PRODUCTION_DEPLOYED = YES
LIVE_RELEASE = /opt/umtuba/production/releases/b5fbeff2-20260829075848
LIVE_SOURCE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
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
BLOCKERS = NONE
NOTES = ANON_KEY absent as before; house key is PUBLISHABLE_KEY and was inlined. Watch still has pre-existing React #418. origin/alpha-0.2 not FF'd. Isolated branch not pushed. Rollback = b2c0bbd1-20260829074010.
```

Full packet: `docs/ops/central-umtuba-brand-rebase-deploy-v1/RELEASE_NOTES.md`.

## Exact files changed

Docs only after release (uncommitted; brand SHA history not modified):

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md` (this packet)
- `docs/ops/central-umtuba-brand-rebase-deploy-v1/` (host scripts, smoke JSON, screenshots, release notes)

No product/runtime files changed in this deploy GO.

## Migrations created

None.

## Security review

- Production env values never printed. Presence flags only.
- Canonical public names at build: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. ANON_KEY absent; not invented.
- Inlining proven on the **new** tree before `ln -sfn`.
- No credential rotation. No remote migration. No Stripe/payments files in the alpha→brand diff.
- Parent dirty tree not reset, stashed, or checked out. `_port_extract` not touched. Windows Desktop not used as artifact destination.

## Tests

Live Playwright smoke PASS for `/`, `/?hl=en`, `/welcome`, `/watch`, `/learning`, `/store`. Evidence: `docs/ops/central-umtuba-brand-rebase-deploy-v1/post-deploy-smoke.json`.

## TypeScript

Not re-run this deploy GO. Prior isolated rebase gate: `tsc --noEmit` PASS.

## Build

Host `npm run build` PASS. `BUILD_ID=hygi-ODkpCIc0YibGtTQT`.

## git diff --check

Not applicable for product diffs this GO. Brand SHA vs `b2c0bbd` already checked at rebase.

## git status --short

Brand worktree `central/umtuba-brand-rebase-safety-v1` @ `b5fbeff` plus uncommitted deploy docs. Not pushed.

Parent remains `office/profile-hero-completeness-v1` @ `380a366` dirty.

## Open issues

- Isolated branch `central/umtuba-brand-rebase-safety-v1` and SHA `b5fbeff` are **not** on origin. Central may later FF `origin/alpha-0.2` to this SHA if desired. This GO did not push.
- Watch minified React #418 is pre-existing (P0). Not a brand regression.

---

# PRIOR — CENTRAL_UMTUBA_BRAND_REBASE_SAFETY_GATE_V1

## Summary

Brand-only reapply onto current `origin/alpha-0.2` succeeded in an isolated worktree. The new tip is a fast-forward of alpha. Not pushed. Not merged to `alpha-0.2`. **Superseded as LAST ASSIGNED by the authorized production deploy above.**

```text
TASK_ID = CENTRAL_UMTUBA_BRAND_REBASE_SAFETY_GATE_V1
STATUS = COMPLETE_LOCAL
CURRENT_ALPHA_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
APPROVED_SOURCE_SHA = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
UNIQUE_BRAND_COMMITS = d0858b0, 3dc06aa, 1c6b3fc
UNIQUE_ALPHA_COMMITS = 157
NEW_RELEASE_BRANCH = central/umtuba-brand-rebase-safety-v1
NEW_RELEASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
FAST_FORWARD_SAFE_FROM_ALPHA = YES
TYPECHECK = PASS
FOCUSED_TESTS = PASS (18)
BUILD = PASS
LOCAL_PREVIEW = http://127.0.0.1:3031/welcome
OWNER_APPROVED_VISUAL_PRESERVED = YES
DEPLOYED = NO
PUSHED = NO
PARENT_PRESERVED = office/profile-hero-completeness-v1 @ 380a366
```

`git fetch --prune` on 2026-08-29. `origin/alpha-0.2` still `b2c0bbd`. Source branch still `1c6b3fc`. Dirty parent not used.

Source-not-in-alpha (13): three brand commits plus store sandbox, storefront overhaul, owner post-delete, iOS AASA, and PC2 docs. Only the three brand commits were cherry-picked. `f455d90` not present.

Alpha-not-in-source (157), including live Learning/Store/i18n and Next.js **16.2.11**. Those remain the base.

Cherry-pick conflicts were chrome/docs only. Resolutions:

- Keep alpha `LanguageSelector` + i18n on `AppTopNav` / `AuthShell`; add official mark.
- Keep alpha dark-canvas body + existing site `JsonLd`; add `BrandJsonLd`.
- Do **not** restore deleted `app/opengraph-image.tsx` (alpha uses static OG).
- Remove Welcome Alpha badge (`t("landing.badge")`) and `JoinBetaLink` CTAs.
- Leave Globe import and `LandingHeroGlobe` unchanged.

Local preview HTML: stacked + symbol approved-video assets present; `Alpha 0.2` / `Join Beta` / `Join the Beta` absent.

## Exact files changed

Versus `origin/alpha-0.2` (release commits only; this report is uncommitted):

- `app/apple-icon.png`, `app/icon.png`, `app/favicon.ico`
- `app/components/AppTopNav.tsx`
- `app/components/auth/AuthShell.tsx`
- `app/components/brand/BrandJsonLd.tsx`
- `app/components/brand/UmtubaStackedLogo.tsx`
- `app/components/landing/LandingHero.tsx`
- `app/components/legal/LegalDocumentPage.tsx`
- `app/components/product/ProductLoadingState.tsx`
- `app/feed/page.tsx`
- `app/layout.tsx`
- `app/manifest.ts`
- `app/welcome/page.tsx`
- `lib/site/brand.ts`, `lib/site/brandAssets.test.ts`, `lib/site/metadata.ts`, `lib/site/metadata.test.ts`, `lib/site/welcomeBetaLabels.test.ts`
- `public/brand/*`, `public/favicon*`
- `scripts/pack-approved-favicon.mjs`
- PC2 brand evidence under `docs/ai/PC2_UMTUBA_*` and `docs/ai/pc2-official-logo-from-approved-video-v1/package/`

New isolated commits: `390475c` (from `d0858b0`), `85ebaae` (from `3dc06aa`), `b5fbeff` (from `1c6b3fc`).

## Migrations created

None.

## Security review

- No secrets / `.env` printed. Local preview has no Supabase URL (expected; Welcome still rendered).
- No remote migration. No Stripe/payments files in the alpha diff.
- Next.js remains `16.2.11` from alpha (CVE pin preserved).
- Parent dirty tree not reset, stashed, or checked out.
- `_port_extract` not touched. Windows Desktop not used as artifact destination.

## Tests

`.\node_modules\.bin\vitest.cmd run --testTimeout=30000 lib/site/welcomeBetaLabels.test.ts lib/site/brandAssets.test.ts lib/site/metadata.test.ts`

PASS — 3 files, 18 tests.

## TypeScript

`.\node_modules\.bin\tsc.cmd --noEmit` — PASS.

## Build

`npm run build` — PASS (Next 16.2.11). `/welcome` in the route table.

## git diff --check

PASS on `origin/alpha-0.2...HEAD`.

## git status --short

Worktree `central/umtuba-brand-rebase-safety-v1` @ `b5fbeff` plus this uncommitted handoff (`docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`). Not pushed.

Parent remains `office/profile-hero-completeness-v1` @ `380a366` dirty.

## Open issues

- Owner/Central must visually confirm `http://127.0.0.1:3031/welcome` before any later merge/deploy GO.
- This GO does **not** authorize push, merge to `alpha-0.2`, or production deploy.
- Welcome i18n key `landing.badge` may still say Alpha 0.2 in catalogs; the Welcome badge UI is removed so it is not shown.
