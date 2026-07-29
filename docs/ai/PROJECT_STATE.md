# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` — Wave 4 alpha stabilization complete (Revenue + Commerce + AI, flags OFF)

## Active feature (this machine — Desktop)

- **Branch:** `integration/w4-alpha-stabilization`
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-integration-w4-alpha-stabilization`
- **Task:** Integration Program V1 — Wave 4 Alpha Stabilization (closing)
- **See:** `docs/ai/CURSOR_REPORT.md`

## Closed on alpha-0.2 (do not reopen)

- Home Circular Arc / Assembly V1 (`6fac440`)
- Creator Space Photos Lightbox V1 (`769039d`)
- Creator All Timeline Contract V1 (`4fdbf30`)
- Integration W1 Revenue / W2 Commerce / W3 AI via Wave 3.5 (`6061a6a`)
- Wave 4 Alpha Stabilization Sweep (tsc + store CRLF + AI lint delta)

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- AI product flags default OFF (`UMTUBA_AI_HUB`, `UMTUBA_AI_ASSISTANT_RUNTIME`, `UMTUBA_AI_VIDEO_PERSONALIZATION`)

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).

Official close-out document: `docs/learning/UMTUBA_LEARNING_V1_FINAL.md`
Session continuity: `docs/ai/SESSION_HANDOFF.md`

## Integration status

| Track | Status |
| --- | --- |
| Unified Revenue Platform Foundation | On alpha via W3.5 |
| Commerce E2E Beta Readiness | On alpha via W3.5; store suite fully green after W4 |
| Shared AI Core / Hub / Assistant | On alpha via W3.5 (flags OFF); W4 cleared AI lint delta |
| Alpha Stabilization Sweep | Wave 4 closed |

Default: Do not modify frozen Commerce architecture documents.

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- No remote Supabase migration apply without explicit approval.
- No destructive Git actions without explicit approval.
