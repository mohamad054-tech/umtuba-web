# PC2 UM Streak Local Database Runtime Gate V1

**TASK_ID:** `PC2_UM_STREAK_LOCAL_DATABASE_RUNTIME_GATE_V1`  
**Device:** PC2  
**Date:** 2026-09-02  
**Branch:** `pc2/umtuba-um-streak-social-camera-foundation-v1`  
**Worktree:** `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-streak-social-camera-v1`  
**Candidate SHA:** `b0146a71fea108f0aeb2319f17b605c586069fac`  
**Migration:** `supabase/migrations/20260937_um_streak_social_camera_foundation_v1.sql`

## Isolation

- Primary dirty worktree was not reset or used for apply/tests.
- Local Docker Desktop was started. `npx supabase start` used local project `umtuba-web`. `linked_project = null`. No `--linked`. No hosted SQL.
- Production not touched. Not merged. Not deployed. Not pushed.

## Migration chain proof (before apply)

`20260937` does **not** depend on `20260935` / `20260936`. Those files are absent on this branch and were not invented.

Required predecessors **on this branch**:

- `public.messages` / `message_attachments` / `is_conversation_participant` / `get_or_create_direct_conversation` — `20260713_messenger_v1_foundation.sql`
- `public.ugc_users_are_blocked` / `block_ugc_user` — `20260928_ugc_safety_reports_blocks_v1.sql`

Duplicate filename prefixes already on this branch (from alpha, not from this candidate): `20260713`×5, `20260714`×4, `20260728`×2, `20260729`×2.

Local `db reset` also needs two operational facts that are **not** 20260935/36:

1. `20260712` ALTERs `public.posts` but this branch has no `CREATE TABLE public.posts` (dashboard-era table; known local bootstrap in `0f89d449`).
2. Ads foundation file is numbered `20260807` while `20260806` admin review needs `ad_campaigns`.

Temporary local-only apply helpers (then restored; not committed):

- Added `20260711` posts precursor from `0f89d449` (local bootstrap only)
- Temporarily uniquified colliding prefixes so CLI could apply
- Applied `20260807` ads foundation SQL before `20260806`, then `npx supabase migration up --local`

After apply, original filenames were restored. `20260935` / `20260936` remain absent.

## Local apply evidence (commands class)

- `docker` daemon started locally
- `npx supabase start` (local, not linked)
- `npx supabase db reset --local --no-seed --yes` (partial; failed first on missing posts, then on ads order)
- `docker exec supabase_db_umtuba-web psql` for ads foundation-before-review only
- `npx supabase migration up --local` applied through `20260937_um_streak_social_camera_foundation_v1.sql`
- Local `schema_migrations` contains `20260937` and does **not** contain `20260935` / `20260936`

## Two local accounts

Created via local GoTrue admin API on `http://127.0.0.1:54321` (`*.local.test` emails, `email_confirm: true`). Signed in with local anon key. Not production users. Passwords and JWTs are not recorded here.

Script: `docs/ai/pc2-um-streak-local-gate/run-local-db-gate.mjs`

Second run result: `ALL_REQUIRED_DB_GATES_PASS`

## Gate results

| Gate | Result | Evidence |
| --- | --- | --- |
| PRIVATE_MEDIA_RLS | PASS | `can_read_message_media` sender=true, recipient after open=false, stranger=false. Storage re-sign blocked. |
| BLOCKING_ENFORCED | PASS | `block_ugc_user` then send returns `Cannot message a blocked user`. Streak RPC hidden for blocked pair. |
| VIEW_ONCE_SERVER_ENFORCED | PASS | `open_um_visual_message` sets `visual_opened_at`. Second open keeps opened. Recipient signed URL denied. |
| DUPLICATE_INCREMENT_BLOCKED | PASS | Second same-day visual from same sender leaves `current_streak=1`. |
| ONE_SIDED_MESSAGE_NO_INCREMENT | PASS | After A-only send: `current_streak=0`, one qualifying day set, `last_completed_streak_day` null. |
| BOTH_USERS_QUALIFY_INCREMENT | PASS | B reply → `current_streak=1`, `streak_state=started`. Both sides see streak=1. |
| MISSED_DAY_BEHAVIOR | PASS | Service-role `um_streak_apply_visual_event` skip from 2026-09-01 to 2026-09-04 restarts at 1. |
| TIMEZONE_BOUNDARY | PASS | `um_streak_utc_day` 23:59Z → 2026-09-01, 00:00:01Z → 2026-09-02. After-midnight one-sided does not increment. |
| WEB_RUNTIME | PASS | `GET http://127.0.0.1:3018/um-streak-preview` → 200, preview markup present. Local next only. |
| MOBILE_STATIC_CHECK | PASS | Shared domain `lib/umStreak`. Vitest `engine.test.ts` 12/12. Messenger contract 11/11. No store build. |

## Noted SQL display gap (not an increment failure)

First one-sided SQL `streak_state` is `none` instead of `waiting_for_friend` because

`(last_qualifying_day_low = today) <> (last_qualifying_day_high = today)`

is NULL when the other side is NULL. Increment contract is still correct (`current_streak=0`). TypeScript `viewerStatus` already maps one-sided to waiting / your-turn. Fix would need a later Central GO, not this gate.

## Tests

- `npx vitest run lib/umStreak/engine.test.ts` — 12 passed
- `npx vitest run lib/i18n/umStreakTranslation.test.ts` — 1 passed
- `npx vitest run app/messages/messengerProduction.test.ts` — 11 passed
- `node docs/ai/pc2-um-streak-local-gate/run-local-db-gate.mjs` — ALL_REQUIRED_DB_GATES_PASS

## Safety

PRODUCTION_TOUCHED = NO  
MERGED_TO_ALPHA = NO  
DEPLOYED = NO  
`--linked` was never used.

## Next

Wait for a separate Central GO. Do not merge. Do not apply remotely.
