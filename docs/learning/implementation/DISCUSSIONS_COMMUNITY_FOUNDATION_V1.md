# UM Learning — Discussions & Course Community Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-discussions-community-foundation-v1`

Migration: `supabase/migrations/20260858_learning_discussions_community_foundation_v1.sql`

## Scope

Course discussions · Q&A · announcements · community feed · instructor moderation

## Architecture

DB-authoritative community layer on existing Learning courses/spaces.

Reuses:

- `has_learning_course_access` / `can_manage_learning_course` / `is_learning_course_staff`
- profiles labels via `learning_community_author_label`
- `create_notification` (in-app only)
- `learning_audit_write`
- `learning_instructor_course_learners` for announcement fan-out

Tables (RLS force-enabled; SELECT for entitled members; DML revoked — mutations via SECURITY DEFINER RPCs only):

- `learning_discussion_threads` / `learning_discussion_replies`
- `learning_qa_questions` / `learning_qa_answers`
- `learning_announcements`

## Security

- Owner-only edit of own posts; author or staff soft-delete
- Staff-only lock / archive / remove / pin / publish announcements
- `auth.uid()` required; fail closed on missing entitlement
- No service-role from app adapters

## Out of scope

Realtime chat · messaging · live rooms · AI · reactions redesign · analytics · push redesign

## No remote apply

Git-only until explicitly applied.
