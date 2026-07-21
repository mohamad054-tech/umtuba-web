# Current Task

## Task title

UMTUBA World Discovery / Hello City Phase 1–2 — Security Hardening and Local Finalize

## Goal

Harden the existing local World Discovery / Hello City Phase 1–2 foundation:
anon-safe public RLS, restricted place layers, profile_status compatibility,
linked-content ownership, private place media storage, integrity triggers,
exact-context Watch video producer, and aligned handoff documentation.

## Allowed scope

- `supabase/migrations/20260825_world_discovery_hello_city_foundation_v1.sql`
- `supabase/migrations/20260826_world_discovery_domain_phase2.sql`
- `supabase/migrations/20260827_world_discovery_security_hardening_v1.sql`
- `app/actions/worldDiscovery.ts`, `app/actions/worldSearch.ts`
- `app/components/world/**`, `app/world/**`
- `lib/world/**`
- Shared infrastructure required by Exact Context / World nav:
  `app/layout.tsx`, `app/lib/nav/**`, `app/watch/WatchExperience.tsx`,
  `app/components/video/{VerticalVideoFeed,VideoPlayer,VideoSlide}.tsx`,
  `app/city/[citySlug]/components/CityActionBar.tsx`, `vitest.config.ts`
- `docs/world/WORLD_DISCOVERY_*.md`, `docs/ai/CURRENT_TASK.md`,
  `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Living Video Navigation UI implementation
- Pulling or merging `alpha-0.2` in this step
- Remote Supabase migration apply
- Commits / pushes without explicit approval
- Unrelated Store / Live / Ads / Auth product work

## Explicit exclusions from World Discovery commit scope

- `docs/world/WORLD_OS_UX_PHASE3_VIDEO_FIRST_NAVIGATION.md`
- `docs/world/WORLD_OS_LIVING_VIDEO_NAVIGATION_PROTOTYPE_SPEC.md`

## Branch

`office/world-discovery-hello-city-foundation-v1`

Base: `origin/alpha-0.2` @ `dda2e02538425830290686f27452789ac7aa3ffb`

## Status

`in progress — security hardening implemented locally; awaiting approval to commit.
Migrations are local only and must not be applied remotely.`
