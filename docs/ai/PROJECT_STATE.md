# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2` @ `6fac4409f217b6e7d28b2ff4c0a2dab453f45427`

## Active feature (this machine — Desktop)

- **Branch:** `office/unified-revenue-platform-foundation-v1` (from `origin/alpha-0.2` @ `6fac440`)
- **Worktree:** `C:\Users\1\Desktop\umtuba\umtuba-web-revenue-platform-foundation-v1`
- **Task:** Unified Revenue Platform Foundation V1
- **See:** `docs/ai/CURSOR_REPORT.md` · `docs/architecture/revenue/`

## Closed on alpha-0.2 (do not reopen)

- Home Circular Arc Navigation Foundation V1
- Home Circular Arc Preview & Polish V1
- Home Left Action Rail Arc Alignment V1 (`302e32f`)
- Arc design locked: 7 circles, arc `[0,-6,-11,-14,-11,-6,0]`, host `left-[5px]`
- Home Assembly V1 landed on `alpha-0.2` (`6fac440`)

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`
- Preview via existing `shouldMountHomeCircularArc()` only
- Do not modify Home / Navigation / App Shell in this revenue phase
- Do not modify AI Core in this revenue phase

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine |
| **Desktop** | Isolated feature worktrees (current: Revenue Platform Foundation) |

## Safety defaults

- **No commit** without explicit approval in the user request.
- **No push** without explicit approval in the user request.
- **No remote Supabase migration apply** without explicit approval.
- **No destructive Git actions** without explicit approval.
- Follow `docs/DEVELOPMENT_WORKFLOW.md`.
- Follow `docs/ai/CURRENT_TASK.md` for active handoff scope when applicable.
- Write execution results to `docs/ai/CURSOR_REPORT.md`.
