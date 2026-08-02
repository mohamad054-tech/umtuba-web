# Session Handoff — UMTUBA Learning

**Updated:** 2026-08-03

## Machine assignment

| Machine | Role |
| --- | --- |
| **Desktop** | Active Learning workstation |
| **Laptop** | Do not resume Learning unless reassigned; Commerce stopped on Desktop |

## Learning source of truth

| Field | Value |
| --- | --- |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-learning-collaboration-workspace-activity-timeline-foundation-v1` |
| Branch | `office/learning-collaboration-workspace-activity-timeline-foundation-v1` |
| Sync | `0 / 0` with origin (after handoff push) |
| Project ref | `tgucwnjwoyeqoxqaxmew` |
| Snapshot | `docs/learning/operations/LEARNING_CURRENT_STATE_2026-08-03.md` |

## Status scores (Audit V2)

| Metric | Value |
| --- | --- |
| Learning completion (cats 1–11) | **82%** |
| Launch readiness | **52%** |
| Production launch | **FAIL** |

## Completed foundations

Learning Core · Assessments · Assignments · Projects · Community · Live · AI Tutor · Workspace Spine · Workspace Attachments · Workspace Activity Timeline

Remote Learning migrations: `20260828`–`20260864`, `20260866`, `20260872`–`20260874`, `20260896`, `20260897`
History repairs: `20260861`, `20260862`
Commerce `20260875`/`20260876` untouched

## Launch blockers

1. Learning E2E
2. Content block smoke
3. LiveKit environment
4. Catalog performance merge
5. Beta activity seed

## Next milestone

**Learning Production Smoke & E2E Gate V1**
(`learning.ops.production_smoke_e2e_gate_v1`)

## Stop conditions

- No new Learning features before Smoke Gate
- No realtime
- No LiveKit setup yet
- No commit to Commerce — Commerce remains frozen
- No migrations / remote DB mutation without explicit GO

## Do not

- Treat incomplete local Smoke/E2E WIP (if any untracked files remain) as the SoT — next GO starts Smoke Gate cleanly
- Resume Commerce on Desktop unless reassigned
- Blind `db push` / `--include-all`
