# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` — Integration Program V1 + Alpha Beta Productization V1 closed

## Active feature (this machine — Desktop)

- **Branch:** `office/ai-core-anthropic-adapter-v1` (from Gemini `2867a5e`)
- **Task:** AI Core Anthropic Adapter V1 — **implementation complete; staged; not committed**
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-ai-anthropic-adapter-v1`
- **Prior:** Gemini Adapter closed @ `2867a5e` on `office/ai-core-gemini-adapter-v1`
- **See:** `docs/ai/SESSION_HANDOFF.md` / `docs/ai/CURSOR_REPORT.md`

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
| Shared AI Core / Hub / Assistant | On alpha (gated); provider adapters expanding on feature branches |
| Alpha Stabilization Sweep | Wave 4 closed |
| Alpha Beta Productization | Closed on alpha |
| AI Tutor + Provider Reconciliation V1 | Committed + pushed |
| AI Core Gemini Adapter V1 | Committed + pushed @ `2867a5e` (`0 0`) |
| AI Core Anthropic Adapter V1 | Staged on `office/ai-core-anthropic-adapter-v1` (awaiting commit GO) |

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- No remote Supabase migration apply without explicit approval.
- No destructive Git actions without explicit approval.
