# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` @ `03fe5e7e78cf4239317551671c7c33206523def7` — Integration Program V1 + Alpha Beta Productization V1 + Profile Hero Completeness V1 closed on alpha

## Active feature (this machine — Desktop)

- **Branch:** `office/profile-identity-achievements-v1`
- **Task:** Creator Identity Achievements V1 (CREATOR_SPACE §4 medals)
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-profile-identity-achievements-v1`
- **Dependency merge:** `95e33bf` integrates Identity Strip `f574eba`
- **See:** `docs/ai/CURSOR_REPORT.md`

## Closed on Desktop feature branches

- Profile Identity Strip V1 — `office/profile-identity-strip-v1` @ `f574eba902ee424d944bf85d913fad80108dc83b` (integrated into Achievements branch)

## Closed on alpha-0.2 (do not reopen)

- Integration Program V1 Waves 0–4
- Alpha Beta Productization V1 (honesty/gating/ops)
- Profile Hero Completeness V1

## Gates (unchanged defaults)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- AI product flags default OFF (`UMTUBA_AI_HUB`, `UMTUBA_AI_ASSISTANT_RUNTIME`, `UMTUBA_AI_VIDEO_PERSONALIZATION`)
- Commerce confirm DB gate default OFF

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).
Do not pop/apply Learning stash while finishing Web/Profile work on Desktop.
Laptop owns Learning AI Tutor / AI Core / backend / server-actions / integration for that scope.

## Integration status

| Track | Status |
| --- | --- |
| Unified Revenue Platform Foundation | On alpha |
| Commerce E2E Beta Readiness | On alpha; Beta honesty pass applied |
| Shared AI Core / Hub / Assistant | On alpha; product surfaces gated OFF |
| Alpha Stabilization Sweep | Wave 4 closed |
| Alpha Beta Productization | Closed on alpha |
| Profile Hero Completeness V1 | Closed on alpha |
| Profile Identity Strip V1 | Closed; merged into Achievements branch @ `95e33bf` |
| Profile Identity Achievements V1 | Active on Desktop feature branch (staged for manual commit) |

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- No remote Supabase migration apply without explicit approval.
- No destructive Git actions without explicit approval.
