# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Active feature (this machine — Desktop)

- **Branch:** `office/platform-private-ai-workflow-lifecycle-v1-final`
- **Task:** Private AI Workflow & Lifecycle V1 — **implementation complete; not committed**
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-private-ai-workflow-lifecycle-v1-final`
- **Base:** `b0655bb` (`origin/office/platform-shared-ai-surface-integration-v1`)

## Platform track

| Track | Status |
| --- | --- |
| Gemini Live Provider V1 | Closed & pushed @ `30bda6a` |
| Shared AI Surface Integration V1 | Closed & pushed @ `b0655bb` |
| Private AI Workflow & Lifecycle V1 | Active (this worktree) |

## Safety defaults

- Follow `docs/DEVELOPMENT_WORKFLOW.md`
- No remote migration apply without approval
- No training / fine-tuning / private inference / weights
- Never expose provider secrets / `.env.local`
- After GO: Commit (no trailers) → Push → verify `0 0`
- Do not touch or clean mixed older Private AI worktrees
