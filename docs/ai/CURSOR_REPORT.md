# CURSOR_REPORT — PC2_UMTUBA_UM_STREAK_FINAL_COMPLETION_V1

## Summary

Finished the existing UM Streak candidate instead of restarting it. The dirty Communications worktree (`pc2/umtuba-communications-v1-part1b-identity-discovery` @ `196a0358`) was left exactly as found. Isolated completion branch `pc2/um-streak-final-completion-v1` was created from preserved SHA `b0146a71` in a new worktree. Alpha (`origin/alpha-0.2` @ `b5fbeff2`) had no newer commits after the candidate, so no merge/cherry-pick was required.

Completed leftover gaps on the existing Communications-native loop: NULL-safe SQL streak state, explicit `broken` / ended state, first-open signed-URL hardening, localized broken/a11y strings, camera dialog a11y, and the required engine tests. Candidate migration `20260938` only. Production, remote DB, EAS, and Fold6 were not touched.

```text
TASK_ID = PC2_UMTUBA_UM_STREAK_FINAL_COMPLETION_V1
STATUS = CANDIDATE_COMPLETE_LOCAL
STARTING_HEAD = 196a035801ea8cc992693f261052ee83b9390780
STARTING_BRANCH = pc2/umtuba-communications-v1-part1b-identity-discovery
WORKTREE_STATE = DIRTY_UNRELATED_PRESERVED
AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
PRESERVED_STREAK_SHA = b0146a71fea108f0aeb2319f17b605c586069fac
COMPLETION_BRANCH = pc2/um-streak-final-completion-v1
COMPLETION_SHA = PENDING_THIS_COMMIT
COMMUNICATIONS_REUSED = YES
PARALLEL_MESSAGING_SYSTEM_CREATED = NO
QUICK_CAMERA = YES
PHOTO_CAPTURE = YES
VIDEO_CAPTURE = YES
PRIVATE_VISUAL_SEND = YES
VIEW_ONCE = YES
SERVER_AUTHORITATIVE_EXPIRATION = YES
UM_STREAK_ENGINE = YES
SERVER_VALIDATION = YES
DUPLICATE_INCREMENT_PROTECTION = YES
TIMEZONE_POLICY = utc_calendar_day
BLOCKING_ENFORCED = YES
STREAK_UI = YES
BADGES = YES
ARABIC_RTL = YES
ACCESSIBILITY = YES
DB_CHANGE_REQUIRED = YES
MIGRATION_CREATED = YES
MIGRATION_FILE = supabase/migrations/20260938_um_streak_final_completion_v1.sql
PRODUCTION_DB_TOUCHED = NO
TESTS = PASS (27 scoped)
TYPECHECK = PASS
WEB_BUILD = PASS
MOBILE_CHECK = PASS (eslint + tsc on shared UM Streak / messages paths; no EAS)
PRODUCTION_TOUCHED = NO
DEPLOYED = NO
PLAY_TOUCHED = NO
EAS_RUN = NO
FORCE_PUSH = NO
READY_FOR_FOLD6_OWNER_GATE = NO
BLOCKERS = 20260938 not applied locally; live two-account send still needs local env + 20260937/20260938
NEXT_ACTION = Owner local-only apply of 20260938 after 20260937 on a disposable DB, then a separate Fold6 GO
```

## Exact files changed

Isolated completion worktree only:

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `lib/umStreak/types.ts`
- `lib/umStreak/engine.ts`
- `lib/umStreak/engine.test.ts`
- `lib/umStreak/fixtures.ts`
- `lib/supabase/umStreakMessenger.ts`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/de.ts`
- `lib/i18n/messages/es.ts`
- `lib/i18n/messages/fr.ts`
- `lib/i18n/messages/hi.ts`
- `lib/i18n/messages/id.ts`
- `lib/i18n/messages/ja.ts`
- `lib/i18n/messages/ko.ts`
- `lib/i18n/messages/pt.ts`
- `lib/i18n/messages/ru.ts`
- `lib/i18n/messages/tr.ts`
- `lib/i18n/messages/zh-CN.ts`
- `lib/i18n/umStreakTranslation.test.ts`
- `app/messages/types.ts`
- `app/messages/components/UmStreakStatus.tsx`
- `app/messages/components/QuickSocialCamera.tsx`
- `app/messages/components/MessageBubble.tsx`
- `app/um-streak-preview/UmStreakPreviewClient.tsx`
- `supabase/migrations/20260938_um_streak_final_completion_v1.sql`

Preserved untouched:

- Dirty Communications worktree files
- Existing foundation SHA `b0146a71` and worktree docs leftovers
- `20260935` / `20260936`

## Migrations created

`supabase/migrations/20260938_um_streak_final_completion_v1.sql` — candidate only.

- NULL-safe one-sided `waiting_for_friend` (`IS DISTINCT FROM`)
- Live `broken` state after a missed day
- Read-time streak resolve in `get_um_streak_for_conversation`
- Recipient replay of `open_um_visual_message` raises `Visual message already opened`

Not applied locally in this session. Not applied to production. Does not steal `20260935` / `20260936`. Does not overwrite `20260937`.

## Security review

- No secrets printed. No `.env` read/written.
- Private visual media stays in `message-media` (not public UM Life `posts`).
- Send/open RPCs remain SECURITY DEFINER with `search_path = public`.
- Blocked pairs still rejected by `ugc_users_are_blocked` before streak apply.
- Strangers / non-participants cannot open visual media in the domain layer.
- Already-opened recipients do not receive a new signed URL.
- First-open signed URL is issued only when the pre-open row was unopened; replay RPC is fail-closed.
- Residual race: two concurrent first-opens may both request a short-lived signed URL before the row lock wins; the loser gets no URL back. Storage RLS still requires `can_read_message_media`.
- Deleted users cascade off streak tables via `ON DELETE CASCADE`.
- Reporting continues to use existing UGC safety hooks; no parallel report system was invented.

## Tests

```text
npx vitest run lib/umStreak/engine.test.ts lib/i18n/umStreakTranslation.test.ts app/messages/messengerProduction.test.ts
```

27 passed / 0 failed.

Covered: same-day duplicate, one-sided, both qualify, duplicate/retry event, next-day continuation, missed day → broken, longest streak, blocked user, UTC midnight boundary, unauthorized stranger access, view-once open + replay revoke, Arabic streak strings, messenger production contracts.

Local two-account SQL gate for `20260938` was not re-run in this session.

## TypeScript

`npx tsc --noEmit` — PASS.

## Build

`npm run build` — PASS. Routes `/messages` and `/um-streak-preview` present.

## git diff --check

PASS (no whitespace errors).

## git status --short

Recorded before commit on isolated branch `pc2/um-streak-final-completion-v1`. After commit this should be clean except ignored `node_modules` / `.next`.

## Open issues

- `READY_FOR_FOLD6_OWNER_GATE = NO`: source + typecheck + scoped tests + web build passed, but `20260938` is not applied on a local DB in this session, and live camera send still needs local Supabase env + both candidate migrations.
- Do not ask for Fold6 until that local runtime gate exists.
- Do not merge to alpha / push without a later Central GO.
- Communications identity/discovery dirty work remains isolated and uncommitted in the original worktree.
