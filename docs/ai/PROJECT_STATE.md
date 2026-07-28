# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2`

## Active feature (laptop — resume tomorrow)

- **Branch:** `office/home-circular-arc-navigation-foundation-v1`
- **Task:** Home Circular Arc Navigation Foundation V1 — Final Verification PASS, fail-closed
- **See:** `docs/ai/CURRENT_TASK.md`

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine |
| **Desktop** | May perform isolated review / testing tasks only |

## Multi-machine rules

1. Always run before starting:
   - `git fetch --prune`
   - `git pull --ff-only` (on the current branch when behind and fast-forward is possible)
2. Never let two machines modify the **same feature** simultaneously.
3. If `origin` has diverged and fast-forward is impossible: **stop** — do not merge, rebase, reset, stash, or force push without explicit human instructions.

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- **No destructive Git actions** (force push, hard reset, etc.) without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md` for Git, migrations, and push policy.
- Follow `docs/ai/CURRENT_TASK.md` for the active handoff scope.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
