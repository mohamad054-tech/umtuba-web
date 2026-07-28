# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` @ `302e32f98bef66b7b04b732d1dbf587073a5aca6`

## Active feature (this machine)

- **Branch:** `office/home-assembly-v1` (from `alpha-0.2` @ `302e32f`)
- **Task:** Home Assembly V1 — Revised planning (page-row Stage↔Aside only; Arc sealed)
- **See:** `docs/ai/CURRENT_TASK.md`

## Closed on alpha-0.2 (do not reopen)

- Home Circular Arc Navigation Foundation V1
- Home Circular Arc Preview & Polish V1
- Home Left Action Rail Arc Alignment V1 (`302e32f`)
- Arc design locked: 7 circles, arc `[0,-6,-11,-14,-11,-6,0]`, host `left-[5px]`

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- Preview via existing `shouldMountHomeCircularArc()` only
- Store Domain off-limits on laptop

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine |
| **Desktop** | May perform isolated review / testing tasks only |

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- **No destructive Git actions** without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- Follow `docs/ai/CURRENT_TASK.md` for active handoff scope.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
