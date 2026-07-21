# Current Task

## Task title

UMTUBA Living Video Navigation Prototype V1

## Goal

Validate the overlay-first interaction model on the existing Watch surface:
compact capability circles open one reusable prototype overlay while the active
video/feed tree remains mounted and exact-context departure behavior is
unchanged.

## Allowed scope

- `app/watch/WatchExperience.tsx`
- `app/components/video/living-navigation/**`
- Focused Living Navigation tests and the Vitest include needed to run them
- Existing Watch styling only where required for the prototype
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Real World, Store, Journey, AI, Wallet, or Hello City product behavior
- New routes, APIs, server actions, database access, migrations, GPS, Supabase,
  LiveKit, or an Attention Engine
- Changes to accepted World implementation/migrations or unrelated product code
- Pull, rebase, merge, push, commit, or remote migration apply without explicit
  approval

## Design inputs (read-only and excluded from commit unless later approved)

- `docs/world/WORLD_OS_UX_PHASE3_VIDEO_FIRST_NAVIGATION.md`
- `docs/world/WORLD_OS_LIVING_VIDEO_NAVIGATION_PROTOTYPE_SPEC.md`

## Branch

`office/living-video-navigation-prototype-v1`

Base: `6c9d560f56a558755f28626f9f80f8e93bd90d96`

## Status

`in progress — implementation authorized; no commit, push, or remote migration
apply authorized.`
