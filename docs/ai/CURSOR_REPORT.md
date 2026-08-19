# CURSOR_REPORT — Rewards / Referral Engine V1

```text
TASK_ID = CENTRAL_UMTUBA_REWARDS_REFERRAL_ENGINE_V1
STATUS = IMPLEMENTED_LOCAL
BASE_SHA = f66f1c921c166b9a5fe0a1d103817e2bdf8a6179
WORKTREE = D:\umtuba-central\repos\umtuba-web-rewards-referral-engine-v1
BRANCH = central/rewards-referral-engine-v1
WEB_PRODUCTION = 26a0d19379b09cd53f08371358903a84745aa842 (unchanged)
20260931 = HOLD_NOT_APPLIED_NOT_COPIED
MIGRATIONS = 20260933_rewards_referral_launch_v1.sql
DEPLOYED = NO
MOBILE_SOURCE_CHANGED = NO
```

## Summary

Reconciled the existing unified rewards design (`20260931` HOLD) and shipped additive `20260933` on the sound-library web SHA. One authoritative engine: verified event → launch_v1 policy → anti-abuse/idempotency → ledger → balance → feedback. Canonical invite URL is `/join?ref=<code>`. Mobile source was not touched.

## Exact files changed

- `supabase/migrations/20260933_rewards_referral_launch_v1.sql`
- `lib/rewards/engine/*`
- `lib/supabase/rewardsEngine.ts`
- `app/actions/rewardsEngine.ts`
- `app/join/page.tsx`
- `app/rewards/page.tsx`
- `app/rewards/components/InviteShareCard.tsx`
- `lib/referral/config.ts`
- `lib/supabase/referral.ts`
- `lib/supabase/middleware.ts`
- `lib/site/indexing.ts`
- `lib/i18n/messages/rewardsCatalogs.ts`
- `docs/rewards/CROSS_PLATFORM_CONTRACT.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`20260933_rewards_referral_launch_v1.sql`. Self-contained. Does not apply or include `20260931`. Collision with `20260929`/`20260930`/`20260932`: none.

## Security review

FORCE RLS on engine tables. Clients cannot set balance, choose amounts, or call `ingest_verified_reward_event`. `process_reward_event` has no amount argument. Welcome bonus is single-key. Self-referral and duplicate referral blocked.

## Tests

65 targeted vitest PASS (`lib/rewards/engine`, award-security, umPointsConfig). `git diff --check` PASS.

## TypeScript

Targeted compile via vitest PASS. Full-project `tsc` in this worktree was blocked by an incomplete local `npm install` (missing Next types), not by rewards source errors.

## Build

Not run. Next install in the worktree did not finish. UI entry points `/rewards` and `/join` changed; host build should run before any later deploy GO.

## git diff --check

PASS.

## git status --short

See commit on `central/rewards-referral-engine-v1`.

## Open issues

- `20260933` not applied remotely.
- Learning/Games/Store awards are contract + trusted ingest; some still need domain triggers.
- Mobile consume RPCs on a later GO after P0 editor-exit SHA.
- Full `next build` pending worktree deps.
