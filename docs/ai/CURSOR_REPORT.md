# CURSOR_REPORT — PC2_UMTUBA_UM_STREAK_SOCIAL_CAMERA_FOUNDATION_V1

## Summary

PC2 continued the isolated UM Streak candidate from `70b51f77` (first foundation commit). Leftover owner-preview gaps were closed: unique conversations, all streak states, Arabic locale control, demo capture/send/open, i18n view-once labels, and one-shot signed-URL hardening. Existing Communications was extended; no parallel messenger. Candidate migration `20260937` remains unapplied. Owner preview is `/um-streak-preview` (demo-labeled). Primary dirty worktree was not touched.

Already done at `70b51f77`: quick camera, private visual RPC, view-once columns, streak engine + SQL, badges 3/7/30/100/365, Communications wiring, catalogs.

Finished now: preview completeness, conversation switching, started / your-turn states, RTL language control, demo send/open, Arabic view-once labels, skip re-sign after open.

## Exact files changed

This continuation (after `70b51f77`):

- `app/um-streak-preview/UmStreakPreviewClient.tsx`
- `app/messages/components/MessageBubble.tsx`
- `lib/umStreak/fixtures.ts`
- `lib/umStreak/engine.test.ts`
- `lib/i18n/umStreakTranslation.test.ts`
- `lib/supabase/umStreakMessenger.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PC2_UMTUBA_UM_STREAK_SOCIAL_CAMERA_FOUNDATION_V1.md`
- `docs/ai/CURSOR_REPORT.md`

Prior candidate (already in `70b51f77`): Communications camera/streak UI, domain, migration `20260937`, locale catalogs, preview route.

## Migrations created

- `supabase/migrations/20260937_um_streak_social_camera_foundation_v1.sql`
- Not applied locally to a hosted/production project
- Does not reuse `20260935` / `20260936`

## Security review

- Private `message-media` bucket; no public URLs
- Storage SELECT gated by `can_read_message_media` (participant, not blocked, not opened/expired except sender)
- Attachment INSERT is RPC-only (`send_um_visual_message` SECURITY DEFINER, `search_path = public`)
- Block check via `ugc_users_are_blocked` before send and streak apply
- Streak increment is server-side; clients cannot submit a streak count
- View-once open is server-recorded; already-opened recipients no longer receive a new signed URL
- Event idempotency: `um_streak_events.event_id` PK + unique `(pair_key, sender_id, qualifying_day)`
- Preview send/open is local DEMO ONLY and does not call production
- No secrets committed

## Tests

- `lib/umStreak/engine.test.ts` — 12 passed (prior 11 plus unique preview states: started / active / waiting / your turn / at risk / badges)
- Messenger production contracts — passed
- `lib/i18n/umStreakTranslation.test.ts` — passed (Arabic view-once / opened)

## TypeScript

- `npx tsc --noEmit` — PASS (stale `.next` cache referencing a non-existent `/messages/um-streak` route was removed first)

## Build

- `npm run build` — PASS (Next 16.2.11). Route `/um-streak-preview` present.

## git diff --check

- PASS

## git status --short

Recorded after the isolated-branch continuation commit. Primary dirty worktree was not committed.

## Open issues

- Live two-user send still needs local `.env.local` + local apply of `20260937` (not done; production apply forbidden)
- `/messages` remains 503 without Supabase public env (existing fail-closed gate)
- cursor-ide-browser MCP could not attach; preview verified via HTTP 200 + Playwright against system Chrome on `http://localhost:3018/um-streak-preview`
- No native iOS/Android camera UI in this worktree; shared domain is `lib/umStreak`
- Profile/identity renumber (`20260935`/`20260936`) remains a separate later GO
- Dedicated message-report table was not added; existing Communications mute/block/delete paths remain the enforcement
