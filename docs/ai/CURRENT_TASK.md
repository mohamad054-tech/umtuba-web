# Current Task

## Task title

UM Learning — Spaces & Membership Foundation V1 (review fixes)

## Goal

Rebase onto latest `origin/alpha-0.2` and implement review findings before merge:
space lifecycle gates, `allow_member_invites`, `public_member_directory`,
peer-admin protection, invite email validation, and expanded contract tests.

## Allowed scope

- `supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql`
- `lib/learning/spacesFoundation.ts`
- `lib/learning/spacesFoundation.test.ts`
- `docs/learning/implementation/SPACES_MEMBERSHIP_FOUNDATION_V1.md`
- `vitest.config.ts` (only if rebase conflict requires it)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Merging into `alpha-0.2`
- Renaming migration `20260828`
- UI / routes / server actions
- Unrelated product modules
- Remote Supabase migration apply
- Force push / hard reset

## Branch

`office/learning-spaces-membership-foundation-v1`

Base target: latest `origin/alpha-0.2`

## Status

`complete — review fixes implemented; feature branch ready for final merge review into alpha-0.2; do not merge yet.`
