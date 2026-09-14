# CURSOR_REPORT — SOCIAL_COMMUNICATIONS_RICH_PROFILE_SOURCE_PROMOTION_WEB_DEPLOY_V1

## Summary

PC2 proved candidate `3ccc164f` is a fast-forward-safe descendant of current `origin/alpha-0.2` `b5fbeff2`. The final diff does not include UM Streak or `20260937`. Live `schema_migrations` tip is still `20260936` (112 rows; `20260934` absent; 35/36 present once). Typecheck PASS. Production build PASS with existing `.env.local` `NEXT_PUBLIC` keys. Relevant comms/profile/nav tests PASS. Stopped before push and deploy: this repo and `DEVELOPMENT_WORKFLOW.md` still have no authorized rollback-capable nginx/Next release path on PC2. Inventing Vercel/SSH would violate the GO. Main dirty checkout was not reset.

Authoritative report: `docs/ai/PC2_SOCIAL_COMM_RICH_PROFILE_SOURCE_PROMOTION_WEB_DEPLOY_V1.md`.

```text
TASK_ID = SOCIAL_COMMUNICATIONS_RICH_PROFILE_SOURCE_PROMOTION_WEB_DEPLOY_V1
STATUS = BLOCKED
PREVIOUS_ALPHA_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
CANDIDATE_SHA = 3ccc164f02ccb8e54cb978bc3620d907038e64a4
FAST_FORWARD_VERIFIED = YES
ORIGIN_ALPHA_SHA_AFTER = b5fbeff29cb0f308481b38c06500c572cd44a9c4
DEPLOYED = NO
ROLLBACK_REQUIRED = NO
BLOCKERS = NO_AUTHORIZED_ROLLBACK_CAPABLE_WEB_DEPLOY_MECHANISM_ON_PC2; PREVIOUS_LIVE_RELEASE_SHA_UNPROVEN
NEXT_RECOMMENDED_STEP = CENTRAL_PROVIDE_EXISTING_NGINX_NEXT_RELEASE_PATH_THEN_FF_ALPHA_AND_CUTOVER
```

## Exact files changed

Isolated-worktree docs only. No product source. No alpha push.

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PC2_SOCIAL_COMM_RICH_PROFILE_SOURCE_PROMOTION_WEB_DEPLOY_V1.md`
- `docs/ai/pc2-source-promo-q-tip.sql`
- `docs/ai/pc2-source-promo-q-versions.sql`
- `docs/ai/pc2-source-promo-fetch-live.mjs`
- `docs/ai/pc2-source-promo-live-fingerprint.mjs`

Prior untracked isolated docs from earlier GOs remain. Not committed. Not pushed.

Clean detached proof worktree (no edits): `C:\Users\Giga store\Desktop\umtuba\umtuba-web-3ccc164f-clean-build` @ `3ccc164f`.

## Migrations created

None. Hosted DB was SELECT-only. `20260934` / `20260937` not applied.

## Security review

- No production data writes.
- No Vault decrypt. No `.env` values printed.
- No fake users, phone binds, or identity hashes.
- Auth-gated `/messages` and `/settings` still 307 to login on current live.
- No deploy, so no new attack surface shipped.

## Tests

Targeted vitest: 86 passed / 1 failed.

The failure is pre-existing on `origin/alpha-0.2`: `app/lib/nav/shellCoherence.test.ts` rejects `overflow-x-hidden bg-[#050510]` on Home. `app/discover/DiscoverShell.tsx` is unchanged vs alpha. Candidate-relevant comms, rich profile, UM Life nav, and public-env tests passed.

## TypeScript

`npx tsc --noEmit` PASS on isolated worktree HEAD `3ccc164f`.

## Build

`npm run build` PASS. Next reported `Environments: .env.local`. Public Supabase env included by the existing Next `.env.local` method. Values not printed.

## git diff --check

FAIL on pre-existing trailing whitespace in the previous `CURSOR_REPORT.md` line that this rewrite replaces. New report files written without trailing whitespace.

## git status --short

Modified: `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`.
Untracked this GO: the source-promotion report plus SELECT/fingerprint helpers. Prior isolated docs from earlier GOs remain untracked. Not committed. Not pushed.

## Open issues

- No authorized PC2 web-release mechanism (same class as Store staged deploy 2026-08-24).
- Exact current live SHA unproven from nginx HTML.
- Pre-existing alpha `shellCoherence` Home/Watch assertion still fails.
- Authenticated Rich Profile / discovery smoke still needs a real session after a later cutover.
