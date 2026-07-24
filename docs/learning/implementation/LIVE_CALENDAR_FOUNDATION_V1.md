# UM Learning — Live Learning & Calendar Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-live-calendar-foundation-v1`

Migration: `supabase/migrations/20260859_learning_live_calendar_foundation_v1.sql`

## Scope

Live class scheduling · instructor management · learner schedule · join gate · attendance · learning calendar · in-platform notifications

## Architecture

New Learning-owned tables (not social `live_rooms`):

- `learning_live_sessions` — course/section/lesson association, UTC timestamptz window, status lifecycle, non-secret provider metadata, server-authored `sfu_room_id`
- `learning_live_attendance` — one row per user/session; server timestamps; idempotent upsert

Reuses:

- `has_learning_course_access` / `can_manage_learning_course` / `is_learning_course_staff`
- `learning_instructor_course_learners` for notification fan-out
- `create_notification` / `learning_audit_write`
- LiveKit mint helpers (`lib/livekit/server.ts`) **after** DB join-gate success

Does **not** reuse social livestream `live_rooms` rows (wrong entitlement/discovery model).

## Join gate

RPC `get_learning_live_session_join_gate` returns safe metadata only (can_join, window, role, server `sfu_room_name`, identity=`auth.uid()`).

App `requestLearningLiveJoin`:

1. Calls join gate (fail closed)
2. Upserts attendance on success
3. If LiveKit env configured → mint token via existing helpers using **server** room name + gate grants
4. If LiveKit not configured → join readiness only (`blocker` set); no fake token

## Calendar

Read-only aggregation of live sessions + assignment `due_at`. Assessment due dates are **not** supported yet (`assessment_due_supported: false`).

## Out of scope

Recording · chat redesign · whiteboard · breakouts · Zoom/Teams · external calendar sync · email/push · attendance grading · AI

## No remote apply

Git-only until explicitly applied.
