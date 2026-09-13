# CROSS-DEVICE HANDOFF — Private AI / Shared AI Orphan Indexes (Desktop → Central)

| Field | Value |
| --- | --- |
| FROM | DESKTOP-A3 / `DESKTOP_FINAL_LOCAL_CLOSEOUT_WAVE_3_V1` |
| TO | Central AI integrator (+ Desktop operator for index freeze) |
| DEVICE_ORIGIN | DESKTOP |
| Generated | 2026-08-12 |
| Priority | High (staged uncommitted AI work on detached bases; finals also off alpha) |

## Cluster summary

All three dirty AI WTs share detached base **`db6f52a`** (`feat(platform): add private AI foundation v1`).

| Worktree | Dirty | Tree identity | Class |
| --- | --- | --- | --- |
| `umtuba-web-private-ai-workflow-lifecycle-v1` | 19 staged | private-only index | **SUPERSEDED** (alpha port `6219633`) |
| `umtuba-web-shared-ai-surface-integration-v1` | 28 staged | shared ⊃ private | **DUPLICATE** + **SUPERSEDED**(private) + **NEEDS_OPERATOR_DECISION** |
| `umtuba-web-shared-ai-surface-integration-v1-clean` | 28 staged | **identical** write-tree to shared (`d4e6a8e…`) | **DUPLICATE** |

## Alpha / final evidence (reconciled with A2 Wave 3)

| Tip / ref | SHA | On alpha? | Class / note |
| --- | --- | --- | --- |
| Alpha port (SoT) | `6219633` | **YES** | `feat(ai): port private AI workflow lifecycle onto alpha lineage` |
| private-ai `…-final` | `eb9e743` | NO (SHA) | **SUPERSEDED** — migration blob `199cbb5` **matches** alpha/`6219633` |
| shared-ai `…-final` | `b0655bb` | NO (SHA) | **SUPERSEDED** vs later alpha shared-AI reconcile (`e84475a`); retain for residual audit |
| Staged private migration blob | `fd67ab5…` | — | **≠** alpha `199cbb5` → regressive orphan index |

Notes:

- A2 Wave 3 classified private orphan indexes **superseded** and shared twins **duplicate** — A3 confirms with live blob compare.
- Shared staged index still differs from `b0655bb` and may contain paths absent from alpha tip (e.g. `lib/ai/sharedAiSurfaceIntegration.test.ts`) → Central audit only; not Desktop implementation.

## Staged path highlights (shared / private)

- `supabase/migrations/20260880_private_ai_workflow_lifecycle_v1.sql`
- `docs/architecture/PRIVATE_AI_WORKFLOW_LIFECYCLE_V1.md`
- `lib/privateAi/*` lifecycle/audit/readiness/tests
- `app/admin/private-ai/**`
- Shared-only extras: `lib/ai/*`, `lib/translationStudio/workflow/workflowService.ts`, `app/actions/translationStudio.ts`, `.env.example`

## Earlier private-AI detached chain (clean)

`cf3de8d` / `14ce7fd` / `ba0cca4` / `53637d8` / `517cff5` — classified **SUPERSEDED** vs later finals; preserve only.

## Requested Central actions

1. Treat private lifecycle as **already on alpha** via `6219633`; do not re-land staged private index.
2. Audit shared staged-only residual paths vs live alpha shared-AI tip; commit only if unique value remains (Desktop will not).
3. Keep dirty/detached AI WTs frozen until explicit operator dedupe GO — no Desktop delete/reset.
4. Cross-read A2 Wave 3 residual report for Jinn/`jinnMedia` lane (separate from this orphan cluster).

## Desktop guarantees

- Indexes left staged exactly as found
- No commit/reset/clean on these WTs
- No AI feature expansion in Wave 3
