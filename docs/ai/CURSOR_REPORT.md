# Cursor Report — Moderation foundation V1 (local file only)

## Summary

Wrote additive migration `supabase/migrations/20260939_moderation_foundation_v1.sql`. Branch check: `posts.deleted_at`, `posts.visibility`, `profiles.moderation_status`, `profiles.privacy_settings`, and `is_username_available` do not exist here. Number 20260935 skipped because live already applied 20260935–20260938. Not applied remotely. App code not changed.

## Exact files changed

- `supabase/migrations/20260939_moderation_foundation_v1.sql` (created)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`20260939_moderation_foundation_v1.sql` — not applied.

## Security review

Additions only: new columns with safe defaults, new check constraints on those columns, partial index, data flag on `user_id IS NULL` posts (no DELETE), new SECURITY DEFINER read helper + GRANT EXECUTE. No REVOKE, no policy DDL, no RLS change.

## Tests

Not run (SQL file only; local Supabase unavailable).

## TypeScript

Not required (no TS edits).

## Build

Not required.

## git diff --check

Not run.

## git status --short

Not recorded.

## Open issues

Do not apply to production until Central GO. Signup still uses direct `profiles` select.
