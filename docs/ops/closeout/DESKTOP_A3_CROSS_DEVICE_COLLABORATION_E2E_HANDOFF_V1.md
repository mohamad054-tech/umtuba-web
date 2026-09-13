# CROSS-DEVICE HANDOFF — Collaboration Learning Link/Unlink E2E (Desktop → Laptop/Central)

| Field | Value |
| --- | --- |
| FROM | DESKTOP-A3 / `DESKTOP_FINAL_LOCAL_CLOSEOUT_WAVE_3_V1` |
| TO | Laptop Collaboration owner + Central integrator |
| DEVICE_ORIGIN | DESKTOP |
| Generated | 2026-08-12 |
| Priority | Critical (severe dirty + wrong upstream; Desktop must not “fix” by cleaning) |

## Location

| Item | Value |
| --- | --- |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-collaboration-learning-link-unlink-local-e2e-v1` |
| Branch | `office/collaboration-learning-link-unlink-local-e2e-desktop-v1` |
| HEAD | `be5d836aae2697790432bfec7b5e799802ac2498` |
| Subject | `feat(collaboration): add learning link unlink e2e provisioning harness v1` |
| Configured upstream | `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` (**WRONG**) |
| Ahead/behind vs upstream | **0 / 16** |
| Matching `origin/<same-name>` | **MISSING** |
| On alpha? | **NO** |

## Dirty shape (severe)

- ~**106** unstaged changes — predominantly **deleted** `supabase/migrations/*` (production migration tree wiped in WT)
- Untracked local e2e stubs + `supabase/migrations_full_local_backup/` + debug login scripts (`scripts/collaboration-e2e/_debug_login*.cjs|mjs`)
- Meaningful modified product/test files also present:
  - `app/actions/collaboration.ts`
  - `e2e/collaboration/smoke/learning-link-unlink.spec.ts`
  - `supabase/config.toml`
  - `.gitignore`
- `test-results/` present

## Classification

**WRONG_UPSTREAM** + **ACTIVE_VALID_WIP** + **NEEDS_OPERATOR_DECISION**

## Secondary Collaboration dirty (low severity)

| WT | HEAD | Class | Note |
| --- | --- | --- | --- |
| `…-collaboration-login-nav-reverif-v1` | `188423d` | NEEDS_OPERATOR_DECISION | `CURSOR_REPORT` + `test-results/` only; upstream OK 0/0 |

## Requested Laptop / Central actions

1. **Do not** fast-forward this WT to the mis-pointed upstream (would not match branch intent; risk of further confusion).
2. Re-point upstream to a correct Collaboration e2e remote branch (create if needed) — Laptop-owned.
3. Triage mass migration deletes: restore from `migrations_full_local_backup/` vs reset WT vs rebuild harness on clean SoT — **operator decision**. Desktop will not discard.
4. Salvage or rewrite `learning-link-unlink.spec.ts` + `collaboration.ts` deltas onto current Collaboration SoT.
5. Treat debug `_debug_login*` scripts as disposable unless Laptop wants them.

## Desktop guarantees

- No Collaboration feature development in Wave 3
- No `git clean` / checkout / restore of migrations
- No upstream rewrite performed
- WT preserved exactly as found
