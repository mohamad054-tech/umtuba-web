# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` @ `769039d796e37d3e27c4b8bdc2bb49aff57b53c7` (pre-merge tip; update after FF-merge)

## Active feature (this machine)

- **Branch:** `office/profile-all-timeline-contract-v1`
- **Task:** Creator Space All Timeline Contract V1 — Final Verification → Commit / Push / FF-merge
- **See:** `docs/ai/CURRENT_TASK.md`

## Closed on alpha-0.2 (do not reopen)

- Home Circular Arc Navigation Foundation V1
- Home Circular Arc Preview & Polish V1
- Home Left Action Rail Arc Alignment V1
- Home Assembly V1
- Creator Space Photos Lightbox V1 (`769039d`)
- Arc design locked: 7 circles, arc `[0,-6,-11,-14,-11,-6,0]`, host `left-[5px]`
- Creator Space All Timeline Contract V1 (closing via this branch)

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
