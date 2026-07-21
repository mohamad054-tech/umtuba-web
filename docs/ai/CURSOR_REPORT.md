# Cursor Report — World Discovery renumber / amend / rebase

## Summary

Renumbered World migrations to avoid clashing with UEOS `20260822`, amended
the local World commit, and rebased cleanly onto `origin/alpha-0.2`.

- Branch: `office/world-discovery-hello-city-foundation-v1`
- Rebase base: `origin/alpha-0.2` at
  `7631368f138794855dcaeea4a41835918edfd621`
- Pre-closure-amend HEAD: `ce8899ab48b463218cefbb7e15dca0c4276f3e34`
- Message unchanged: `feat(world): add World Discovery and Hello City foundation`
- No push. No remote migration apply. No merge.
- Living Video Navigation docs remain untracked and were never staged.

Note: during `git fetch`, `origin/alpha-0.2` advanced past the previously
audited tip `38ec7ac` to `7631368` (`feat(store): add trusted payment outcome
sync`). Rebase landed on that tip with **no conflicts**.

## Exact files changed

### Migration renames (this operation)
- `20260822_world_…` → `20260825_world_discovery_hello_city_foundation_v1.sql`
- `20260823_world_…` → `20260826_world_discovery_domain_phase2.sql`
- `20260824_world_…` → `20260827_world_discovery_security_hardening_v1.sql`

### Reference updates for renames
- `supabase/migrations/20260826_…` / `20260827_…` header dependency comments
- `lib/world/worldFoundation.test.ts`
- `lib/world/worldPhase2.test.ts`
- `lib/world/worldHardening.test.ts`
- `docs/world/WORLD_DISCOVERY_HELLO_CITY_FOUNDATION_V1.md`
- `docs/world/WORLD_DISCOVERY_PHASE2_ARCHITECTURE.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

### Present but excluded (still untracked)
- `docs/world/WORLD_OS_UX_PHASE3_VIDEO_FIRST_NAVIGATION.md`
- `docs/world/WORLD_OS_LIVING_VIDEO_NAVIGATION_PROTOTYPE_SPEC.md`

## Migrations created

Local only (not applied remotely). Final set after renumber:

1. `20260822_ueos_foundation_v1.sql` (upstream UEOS — untouched)
2. `20260825_world_discovery_hello_city_foundation_v1.sql`
3. `20260826_world_discovery_domain_phase2.sql`
4. `20260827_world_discovery_security_hardening_v1.sql`

No duplicate versions for `20260825` / `20260826` / `20260827`.

## Security review

- No new security surface from renumber/rebase.
- World hardening contracts unchanged aside from migration filenames.
- UEOS migration name preserved.

## Tests

- Pre-amend World Vitest: **PASS** (3 files / 48 tests)
- Post-rebase World Vitest: **PASS** (3 files / 48 tests)
- Nav + exact-context related Vitest: **PASS** (4 files / 50 tests)
- Full `npm test`: **FAIL** — **3 inherited upstream failures / 854 passes**.
  Exact cause: CRLF-sensitive Store assertions / comment stripping on Windows.
  - `lib/store/paymentOutcomeSync.test.ts`: `locks event then order then
    attempt` expects an LF-only SQL substring; the Windows checkout contains
    CRLF, so `orderForUpdate` is `-1`.
  - `lib/store/storeRemoteE2eSandboxScripts.test.ts`: `seed aborts with
    ACCOUNT_BLOCKER and never inserts auth.users` and `cleanup targets fixed
    UUIDs / marker and avoids truncate` fail because the comment stripper is
    CRLF-sensitive and leaves prohibition text (`INSERT INTO auth.users` /
    `truncate`) in the inspected string.
- Exact-upstream reproduction on `origin/alpha-0.2` @
  `7631368f138794855dcaeea4a41835918edfd621`: **3 failed / 20 passed** with
  identical assertion signatures (detached worktree).
- Classification: **A — inherited upstream failure, identical and unrelated
  to World**. Store test/input files are unchanged from upstream; World
  files, migrations, imports, and the added Vitest include pattern do not
  participate in these direct test runs.

## TypeScript

- Pre-amend `npx tsc --noEmit`: **PASS**
- Post-rebase `npx tsc --noEmit`: **PASS**

## Build

- Post-rebase `npm run build`: **PASS**

## git diff --check

- Pre-amend: **PASS**
- Post-rebase: **PASS**

## git status --short

```
## office/world-discovery-hello-city-foundation-v1
?? docs/world/WORLD_OS_LIVING_VIDEO_NAVIGATION_PROTOTYPE_SPEC.md
?? docs/world/WORLD_OS_UX_PHASE3_VIDEO_FIRST_NAVIGATION.md
```

Ahead/behind vs `origin/alpha-0.2`: **1 ahead / 0 behind**

## Open issues / remaining risks

1. Migrations remain local only — do not apply remotely until explicit approval.
2. Full `npm test` has the three documented, deterministic upstream Store
   assertion failures; these are not World regressions.
3. Living Video Navigation design docs must stay untracked / out of any push.
4. Waiting for explicit push approval.

## Rebase / amend trail

| Step | Hash |
|------|------|
| Pre-renumber World commit | `76ad9593224a9988b80cf6c7e46958a448a41076` |
| Post-amend (renumber) | `939ea0a04cf279755fc865d84e7a956bfc7fac00` |
| Post-rebase onto `origin/alpha-0.2` | `ce8899ab48b463218cefbb7e15dca0c4276f3e34` |

Conflicts: **none**. `vitest.config.ts` retained `lib/world`, `lib/wallet`,
and `lib/ueos` include patterns.

Do not push. Do not apply migrations remotely. Wait for approval.
