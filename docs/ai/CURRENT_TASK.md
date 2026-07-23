# Current Task

## Task title

UMTUBA Ads Platform — Render Descriptor Pipeline V1 Hardening

## Goal

Close Final Review findings for Render Descriptor Pipeline V1: remove
caller-authoritative tracking identity overrides, enforce candidate
eligibility, clarify placement-mismatch diagnostics, remove dead rejection
taxonomy, and add missing fail-closed / immutability / determinism tests.
Internal / contract-only — no production delivery or rendering.

## Allowed scope

- `lib/ads/platform/renderDescriptor*`
- `lib/ads/platform/index.ts`
- Direct supporting contracts only if strictly required (imports only)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `app/discover/components/DiscoverShell.tsx` (unrelated local changes — do not touch)
- Learning / Store / World / Messages / Live
- Unrelated Ads module modifications
- Delivery / rendering / auction / ranking / billing / payments
- Network / database / Supabase / feature flags
- Migrations / remote Supabase apply
- Commit / push without explicit approval

## Branch

`alpha-0.2`

## Status

`hardened — verified (pipeline+contract tests 36/36, platform tests 432/432,
tsc, build, git diff --check clean); no commit/push.`
