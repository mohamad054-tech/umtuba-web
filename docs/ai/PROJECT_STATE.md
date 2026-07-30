# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` — Integration Program V1 + Alpha Beta Productization V1 closed

## Active feature (this machine — Desktop)

- **Branch:** `office/ai-tutor-provider-reconciliation-v1` @ `62cd3eb2d4edfc624d3ac02c0ee3229d3330a6d3`
- **Task:** AI Tutor + Provider Foundation Reconciliation V1 — **saved / pushed (`0 0`)**
- **Tutor source:** `9e90448ce8e4566fd369476a2571844378b0950c`
- **Provider source:** `01f23d9a584d7b970788fd71444faf6979f25330`
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-ai-tutor-provider-reconciliation-v1`
- **Next GO:** Gemini Adapter V1
- **See:** `docs/ai/SESSION_HANDOFF.md`

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
Tutor backend capabilities continue on AI Platform branches; Learning UX remains frozen.

## Integration status

| Track | Status |
| --- | --- |
| Unified Revenue Platform Foundation | On alpha |
| Commerce E2E Beta Readiness | On alpha; Beta honesty pass applied |
| Shared AI Core / Hub / Assistant | On alpha (gated); Provider tip + Tutor tip being reconciled on feature branch |
| Alpha Stabilization Sweep | Wave 4 closed |
| Alpha Beta Productization | Closed on alpha |
| AI Tutor + Provider Reconciliation V1 | Committed + pushed @ `62cd3eb` (`0 0`) |

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- No remote Supabase migration apply without explicit approval.
- No destructive Git actions without explicit approval.
