# Current Task

## Task title

Shared AI Surface Integration V1

## Status

`implementation-complete` — uncommitted; awaiting GO (no commit / no push)

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-shared-ai-surface-integration-v1-final`
2. Branch: `office/platform-shared-ai-surface-integration-v1`
3. Base: `origin/office/platform-gemini-live-provider-v1` @ `30bda6a`
4. Manual commit (no trailers) → push when approved → verify `0 0`
5. Optional: add worktree `.env.local` with `GEMINI_API_KEY` for live smoke via Shared AI Core

## Branch

`office/platform-shared-ai-surface-integration-v1`

## Allowed scope

- `lib/ai/**` (surface wiring, guards, sanitize, tests — not Gemini adapter rewrite)
- `lib/translationStudio/**` (AI port injection only)
- `app/actions/translationStudio.ts`
- `.env.example` (model default docs when changed)
- Handoff docs for this task

## Forbidden scope

- Commit / push / merge without GO
- Changing / printing `GEMINI_API_KEY`
- Inventing new product AI features
- Training / fine-tuning / private inference
- Private AI workflow / migrations
