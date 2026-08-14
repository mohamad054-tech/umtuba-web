# UMTUBA Project State (AI Handoff)

## Project

**UMTUBA** (`umtuba-web`)

## Primary working branch

`alpha-0.2`

## Coordinator resume pointer (20260814)

Web platform declare **PRODUCTION_READY** retained (do not reopen Learning cert).

**UAF-12 on alpha + production (authoritative):**

- `origin/alpha-0.2` tip = `d7b6504f` (integrate `6e494df6` + vitest include)
- `UAF12_ON_ALPHA=YES` — **not** `PENDING_INTEGRATE`
- Production SSH deploy **PASS** → `DEPLOYED_SHA=d7b6504f` · `RELEASE_PATH=/opt/umtuba/production/releases/d7b6504-20260814075002`
- `UAF12_STATUS=FIXED_IMPLEMENTED_RUNTIME_PARTIAL` · `FIXED_VERIFIED=NO` (AUTH_ENV ABSENT)
- Live Priority A auth-callback smoke (20260814 ACK): **PASS** · `AUTH_CALLBACK_LOCALHOST=NO` · UAF-05 retained
- Report deploy: `D:\umtuba-central\reports\UMTUBA_CENTRAL_UAF12_PRODUCTION_DEPLOY_V1.md`
- Report ACK: `D:\umtuba-central\reports\UMTUBA_CENTRAL_PC2_INDEPENDENT_QA_ACK_AND_NEXT_GO_V1.md`

**PC2 independent QA (platform-core audit V1):** ACCEPTED. `STALE_WORKTREE=YES` (office ahead/behind alpha) — **PRESERVE**; no reset/clean/force/merge into alpha. `NEW_FINDINGS=NONE` · `HIDDEN_RELEASE_BLOCKER=NO` · `PC2_NEXT=STOP` · `NEW_WAVE_AUTHORIZED=NO`.

Known leftovers (not new): D1 locale-unpinned · UAF-12 runtime PARTIAL · PWA Location smoke not probed this audit · Store premium + iOS AASA = office-only / Central DECISION_REQUIRED.

`CENTRAL_STORE_AUTH_ENV_READY=NO` · `WHOLE_PLATFORM_UX_READY=NO`

**NEXT_CENTRAL_GO_ID** = `CENTRAL_UAF12_SEEDED_RUNTIME_QA_V1` (gate: AUTH_ENV PRESENT). Optional packet: D1 locale pin. Do not reopen closed UM Core/Learning/Translation/PWA/UAF closed set.

See `docs/ai/CURRENT_TASK.md`.

## Learning chapter status

**Learning V1 is officially APPROVED and FROZEN** (2026-07-27).

Official close-out document: `docs/learning/UMTUBA_LEARNING_V1_FINAL.md`

Session continuity: `docs/ai/SESSION_HANDOFF.md`

## Active academy priority

Default: Consolidation complete. Commerce beta-ready on dedicated branches (not merged). Do not modify frozen Commerce architecture documents. Do not delete Store docs.

### Autonomy (standing)

Routine in-scope create/update/run/mirror/report work may proceed without per-step approval **only inside the explicitly active phase**.

Paused phases must not auto-resume. Still ask before: destructive data loss, destructive prod DB, push/force-push, merge/delete branches, system-wide installs, credentials/payments, irreversible out-of-scope actions.

## Source of truth

- **GitHub origin** is the source of truth for the repository.
- Always synchronize with origin before starting work.
- Learning curriculum packages: Bootcamp / Jinn Wave path + dist importers (see Learning V1 final doc).
- Learner runtime state: UMTUBA Learning DB.

## Machines

| Machine | Role |
| --- | --- |
| **Laptop** | Primary development and integration machine |
| **Desktop** | May perform isolated review / testing tasks only |
| **Server / Central** | Production integration authority |

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
