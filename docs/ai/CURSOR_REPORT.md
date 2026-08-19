# CURSOR_REPORT — Rewards / Referral security hardening V1

```text
TASK_ID = CENTRAL_REWARDS_REFERRAL_SECURITY_HARDENING_V1
STATUS = IMPLEMENTED_LOCAL
BASE_SHA = 1c5fda85c57a2fe2b05dfa64c36c052b0d19dc29
REMOTE_REF = origin/central/rewards-referral-engine-v1
MIGRATION_STRATEGY = REPLACE_UNAPPLIED_20260933_IN_PLACE
PRODUCTION_DB_CHANGED = NO
DEPLOYED = NO
MOBILE_DISTURBED = NO
```

## Summary

Replaced unapplied `20260933` so production never sees the insecure client-mint path. `process_reward_event` is revoked. Trusted mint is `process_reward_event_trusted` (argument actor, never metadata). `qualify_my_referral_signup` uses only records bound to `auth.uid()`. Client RPC is `record_contract_reward_event`. 81 rewards tests PASS. No production apply. No web deploy.

## Exact files changed

- `supabase/migrations/20260933_rewards_referral_launch_v1.sql`
- `lib/rewards/engine/engine.ts`
- `lib/rewards/engine/types.ts`
- `lib/rewards/engine/contract.ts`
- `lib/rewards/engine/index.ts`
- `lib/rewards/engine/foundation.contract.test.ts`
- `lib/rewards/engine/security.hardening.test.ts`
- `lib/supabase/rewardsEngine.ts`
- `app/actions/rewardsEngine.ts`
- `docs/rewards/CROSS_PLATFORM_CONTRACT.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

NONE new. Unapplied `20260933` rewritten in place. `20260934` not required.

## Security review

- Client cannot EXECUTE grant RPCs.
- `_trustedActor` metadata rejected and never used as authority.
- Source verification required on the untrusted path.
- Qualification has no cross-user pending fallback.
- Ledger/balance/events writes remain revoked from `anon`/`authenticated`.
- Admin reverse still `is_platform_admin()` only.

## Tests

`npx vitest run lib/rewards` → 81 PASS (5 files), including adversarial hardening cases.

## TypeScript

Rewards tests compile. Full-project `tsc` still hits a pre-existing Sound Page locale error on this worktree, not introduced by this change.

## Build

NOT_RUN (no deploy).

## git diff --check

PASS.

## git status --short

Clean after commit on `central/rewards-referral-engine-v1`.

## Open issues

Ready for a later apply-review GO. Do not apply until that GO. `20260931` remains HOLD.
