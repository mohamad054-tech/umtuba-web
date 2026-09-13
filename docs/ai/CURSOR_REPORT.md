# CURSOR_REPORT — CENTRAL_DEPLOY_OWNER_APPROVED_UMTUBA_BRAND_RELEASE_V1

## Summary

Stopped before integrate/deploy. Authorized remote SHA verified. Exact-SHA release onto production is **not** a fast-forward and is **not** brand-only versus `origin/alpha-0.2`. `docs/DEVELOPMENT_WORKFLOW.md` forbids automatic merge commits when fast-forward is impossible. Did not invent a cherry-pick SHA. Dirty parent left untouched.

```text
TASK_ID = CENTRAL_DEPLOY_OWNER_APPROVED_UMTUBA_BRAND_RELEASE_V1
STATUS = BLOCKED_NOT_FAST_FORWARD
SOURCE_BRANCH = origin/pc2/official-logo-from-approved-video-v1
SOURCE_SHA = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
SOURCE_SHA_VERIFIED = YES
DIFF_SCOPE_VERIFIED = NO
PRODUCTION_BASE = origin/alpha-0.2
PRODUCTION_BASE_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
MERGE_BASE = bc09e1379da595a08e27b3146ff00f3bca5fcb01
FAST_FORWARD_TO_SOURCE = NO
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\CENTRAL-BRAND-RELEASE-V1
BRANCH = central/official-umtuba-brand-release-v1
PARENT_PRESERVED = YES
PARENT_BRANCH = office/profile-hero-completeness-v1
PARENT_HEAD = 380a36646d4de8a37c39a56ac3ccd449f6d8b20d
MERGED = NO
PRODUCTION_DEPLOYED = NO
LIVE_URL = https://umtuba.com/welcome
POST_DEPLOY_SMOKE = FAIL
LOGO_LIVE = NO
ALPHA_BETA_LABELS_REMOVED_LIVE = NO
```

`git fetch --prune` succeeded. `origin/pc2/official-logo-from-approved-video-v1` resolves exactly to `1c6b3fc5312d1c3ef0029785a39d5121de17b9e4`. `origin/main` does not exist. Local-only `f455d90` is not on this machine and was not included.

The three brand commits on top of `b3c05d8` (`d0858b0`, `3dc06aa`, `1c6b3fc`) are chrome-only: official stacked/symbol logo, welcome header/footer, favicon/PWA/metadata, Alpha 0.2 and Join Beta removal. That range does not touch Globe, Learning, Store logic, Stripe/payments, migrations, or post/video behavior.

Releasing **exactly** `1c6b3fc` onto `origin/alpha-0.2` is not possible as a fast-forward. Source also carries store sandbox / premium storefront and owner post-delete commits that are not on current alpha. Alpha carries Learning productization, Learning blank-loading fix, Store `20260934` guard, Home media, i18n recovery, and the Next.js **16.2.11** CVE pin that source does not have (`package.json` on `1c6b3fc` is `next@^16.2.10`). A merge commit would combine those lines. Resetting production to `1c6b3fc` would drop live Learning/Store/i18n/CVE work. Both paths violate STRICT PRESERVATION and the workflow.

Live `https://umtuba.com/welcome` still SSR-renders `Alpha 0.2 · Built for a new generation` as a typographic `landing-hero-brand`. Official `umtuba_logo_stacked_from_approved_video` / `umtuba_symbol_from_approved_video` assets are absent. `https://umtuba.com/healthz` is `200`.

## Exact files changed

Isolated-worktree handoff docs only. No product source change. No parent mutation.

- `docs/ai/CURRENT_TASK.md` (this worktree)
- `docs/ai/CURSOR_REPORT.md` (this worktree)

## Migrations created

None.

## Security review

- No secrets, `.env`, or service-role values read or printed.
- No remote Supabase migration.
- No force push, reset, stash, or parent checkout.
- Brand-only commit range has no Stripe/payments/auth-logic/migration files.
- Exact-SHA deploy would regress Next.js from production `16.2.11` to source `^16.2.10` (CVE-2026-64643 patch on alpha). That is an additional stop reason.
- `_port_extract` not touched. Windows Desktop not used as an artifact destination.

## Tests

Isolated worktree `npm ci` PASS (655 packages). Targeted brand/metadata vitest: **17 passed / 1 failed** (18). Failure is `lib/site/metadata.test.ts` source-hygiene scan of `app/` (`Create Next App` check) **timed out at 5s**, not an assertion miss. Welcome/brand asset tests PASS. Merge/deploy already blocked independently.

## TypeScript

`.\node_modules\.bin\tsc.cmd --noEmit` on the isolated SHA: **PASS** (`tsc_exit=0`).

## Build

`npm run build` **NOT_RUN**. UI/entry points would require a production build only after a legal fast-forward of the exact SHA. That path does not exist.

## git diff --check

PASS on brand range `d0858b0^..1c6b3fc`.

## git status --short

Isolated worktree `central/official-umtuba-brand-release-v1` @ `1c6b3fc` plus this handoff edit of `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md`.

Parent remains `office/profile-hero-completeness-v1` @ `380a366` dirty/untracked. Not reset, not committed, not used as merge target.

## Open issues

1. **BLOCKER:** `origin/alpha-0.2` @ `b2c0bbd` and `1c6b3fc` have diverged. Fast-forward is impossible. Workflow says STOP; do not create a merge commit automatically.
2. **BLOCKER:** Diff versus production base is not brand-only. Source-not-in-alpha includes `b3c05d8` store sandbox, `dad5eb5` storefront overhaul, `72190b6` owner post/video delete, plus docs/iOS AASA. Alpha-not-in-source includes live Learning/Store/i18n/CVE commits.
3. Cherry-picking `d0858b0` + `3dc06aa` + `1c6b3fc` onto `origin/alpha-0.2` would be the brand-only path, but it creates a **new SHA**. This GO forbids merging a different SHA.
4. Live welcome still shows Alpha 0.2 and does not serve the official approved-video logo. No deploy was performed.
5. Next action: Central must authorize either (a) a brand-only cherry-pick onto current `origin/alpha-0.2` (new SHA, then deploy), or (b) a different explicit integration that preserves live Learning/Store/i18n/CVE. Do not deploy `1c6b3fc` as production HEAD.
