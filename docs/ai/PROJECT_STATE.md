# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` — Integration Program V1 + Alpha Beta Productization V1 closed

## Active feature (this machine — Windows Server)

- **Branch:** `office/ai-core-anthropic-on-gemini-recovery-v1`
- **Task:** AI Core Anthropic on Gemini Recovery V1
- **Base:** `919dc75` — `office/ai-core-gemini-adapter-recovery-v1`
- **Worktree:** `D:\umtuba-central\repos\umtuba-web-ai-core-anthropic-on-gemini-recovery-v1`
- **See:** `docs/ai/SESSION_HANDOFF.md` / `docs/ai/CURSOR_REPORT.md`

## Closed on AI provider recovery lineage (do not reopen)

- AI Core Gemini Adapter Recovery V1 @ `919dc75`

## Gates (unchanged defaults)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- AI product flags default OFF (`UMTUBA_AI_HUB`, `UMTUBA_AI_ASSISTANT_RUNTIME`, `UMTUBA_AI_VIDEO_PERSONALIZATION`)
- Commerce confirm DB gate default OFF

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN.** Do not touch Learning in this milestone.

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Latest completed AI provider SoT tip before this task: `office/ai-core-gemini-adapter-recovery-v1` @ `919dc75`.

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- No remote Supabase migration apply without explicit approval.
- No destructive Git actions without explicit approval.
