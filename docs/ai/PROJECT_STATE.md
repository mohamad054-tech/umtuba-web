# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` @ `71dfec204dd06a0058918831aac1e937108f4de8` — Integration Program V1 + Alpha Beta Productization V1 closed

## Active feature (this machine — Desktop)

- **Branch:** `office/profile-hero-completeness-v1`
- **Task:** Creator Space Hero Completeness V1 (re-sync onto latest alpha prepared; manual commit pending)
- **Feature tip:** `3b88b01036269b60410d41830fd24b2af85af091`
- **See:** `docs/ai/CURSOR_REPORT.md`

## Closed on alpha-0.2 (do not reopen)

- Integration Program V1 Waves 0–4
- Alpha Beta Productization V1 (honesty/gating/ops)

## Gates (unchanged defaults)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- AI product flags default OFF (`UMTUBA_AI_HUB`, `UMTUBA_AI_ASSISTANT_RUNTIME`, `UMTUBA_AI_VIDEO_PERSONALIZATION`)
- Commerce confirm DB gate default OFF

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).
Do not pop/apply Learning stash while finishing Profile Hero.

## Integration status

| Track | Status |
| --- | --- |
| Unified Revenue Platform Foundation | On alpha |
| Commerce E2E Beta Readiness | On alpha; Beta honesty pass applied |
| Shared AI Core / Hub / Assistant | On alpha; product surfaces gated OFF |
| Alpha Stabilization Sweep | Wave 4 closed |
| Alpha Beta Productization | Closed on alpha |
| Profile Hero Completeness V1 | Re-sync prepared on feature branch |

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- No remote Supabase migration apply without explicit approval.
- No destructive Git actions without explicit approval.
