# Current Task

## Task title

UMTUBA Ads Platform Γאפ Critical Architecture Closure

## Goal

Resolve final-certification critical blockers only:
canonical authority for delivery/measurement/billing, delivery-gate
production-acceptance semantics (Option B), billing authority, and
production decision-path exclusivity.

## Allowed scope

- `lib/ads/platform/*`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `app/discover/components/DiscoverShell.tsx`
- Learning / Store / World / Messages / Live / product surfaces
- Migrations / remote Supabase apply
- Medium/minor recommendations unless required for a critical blocker
- Commit / push unless explicitly requested

## Branch

`alpha-0.2`

## Status

`implemented Γאפ verified (676/676 platform tests, tsc, build, git diff --check);
critical blockers closed; DiscoverShell untouched; no commit.`
