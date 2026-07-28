# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` @ `6fac4409f217b6e7d28b2ff4c0a2dab453f45427` (pre-merge tip; update after FF-merge)

## Active feature (this machine)

- **Branch:** `office/profile-photos-lightbox-v1`
- **Task:** Creator Space Photos Lightbox V1 — Final UX Polish → Commit / Push / FF-merge
- **See:** `docs/ai/CURRENT_TASK.md`

## Closed on alpha-0.2 (do not reopen)

- Home Circular Arc Navigation Foundation V1
- Home Circular Arc Preview & Polish V1
- Home Left Action Rail Arc Alignment V1
- Home Assembly V1 (`6fac440`)
- Arc design locked: 7 circles, arc `[0,-6,-11,-14,-11,-6,0]`, host `left-[5px]`
- Creator Space Photos Lightbox V1 (closing via this branch)

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
