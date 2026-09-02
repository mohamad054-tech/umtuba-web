# PC2 UM Streak Social Camera Foundation V1

**TASK_ID:** `PC2_UMTUBA_UM_STREAK_SOCIAL_CAMERA_FOUNDATION_V1`  
**Device:** PC2  
**Date:** 2026-09-02  
**Owner approval:** YES  
**Base:** `origin/alpha-0.2` @ `b5fbeff29cb0f308481b38c06500c572cd44a9c4`  
**Branch:** `pc2/umtuba-um-streak-social-camera-foundation-v1`  
**Worktree:** `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-streak-social-camera-v1`

## Product

First Communications-native foundation for CAMERA → SEND TO FRIEND → REPLY → UM STREAK 🔥 → badges.

Not a Snapchat clone. Brand: black + gold, official UMTUBA logo, LEARN · CREATE · SHARE. Feature name: **UM Streak**.

## Isolation

The primary PC2 worktree stayed dirty and untouched. This candidate is a new git worktree from `origin/alpha-0.2`. Fetch was clean. No merge/rebase/reset of the dirty tree.

## Phase A audit (then continued)

- Communications already exists at `/messages` (text DMs, reactions, mute, block trigger).
- `messages.message_type` already allows `image` / `video`.
- `message_attachments` existed as schema-only (no INSERT, no bucket).
- `CameraController.tsx` is 3D navigation, not a device camera.
- Social capture elsewhere is file pickers + private buckets + signed URLs (stories/videos).
- Block enforcement: `ugc_reject_blocked_message` + `ugc_users_are_blocked`.
- UM Life reads public `posts` only. No auto-share path was added.
- Highest migration on this worktree / origin/alpha-0.2: `20260934`.
- Reserved: hosted tip `20260933`, git max `20260934`, proposed `20260935`/`20260936` for a later identity GO.

## What shipped

1. Quick social camera in existing composer + inbox (`QuickSocialCamera`, getUserMedia + library fallback).
2. Private visual message domain + candidate RPC `send_um_visual_message`.
3. View-once foundation: server marks `visual_opened_at` / `visual_expires_at`; signed URL is one-shot; RLS `can_read_message_media`.
4. UM Streak engine (pure TS + SECURITY DEFINER SQL). UTC calendar day. Both users must qualify. Duplicate same-day / event retries do not increment. Blocked pairs are rejected.
5. Streak UX in conversation header/list: started, active today, waiting for friend, your turn, keep it going today.
6. Badge foundation: 3 / 7 / 30 / 100 / 365. No points, no money.
7. Localized keys in all catalogs; Arabic first-class.
8. Owner preview at `/um-streak-preview` (ungated, labeled DEMO ONLY). Real Communications components. Does not fake a successful backend send.

## Database

- Candidate only: `supabase/migrations/20260937_um_streak_social_camera_foundation_v1.sql`
- Not applied to production.
- Does not steal `20260935` / `20260936`.

## Timezone policy

Authoritative streak day = UTC calendar date of the qualifying visual send. Display locale may format the same day. Clients cannot supply a timezone or streak count.

## Verification

- `npx vitest run` scoped: streak engine 11/11, messenger contracts, i18n.
- `npx tsc --noEmit` pass.
- `npm run build` pass. Route `/um-streak-preview` present.
- `git diff --check` pass.
- HTTP `200` on `http://localhost:3017/um-streak-preview` with preview copy present.
- `/messages` remains fail-closed 503 without Supabase public env (existing gate). Live camera send needs local env + this migration applied locally.

## Next

1. Local-only apply of `20260937` on a disposable DB if the owner wants a live two-account streak.
2. Keep profile/identity renumber (`20260935`/`20260936`) as a separate GO.
3. Do not merge to alpha without Central GO.
