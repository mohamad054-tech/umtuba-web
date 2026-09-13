# DESKTOP-A3 — Profile Hero Integration Packet V1

| Field | Value |
| --- | --- |
| AGENT_ID | DESKTOP-A3 |
| WAVE_ID | DESKTOP_CLOSEOUT_WAVE_2_V1 |
| TASK_ID | DESKTOP_STATE_DRIFT_ORPHAN_TRIAGE_CLOSEOUT_V1 |
| Generated | 2026-08-12 12:48:06 +03:00 |
| Safety | No merge/FF/push performed; recommendation only |

## PROFILE_HERO_INTEGRATION_STATE

**SAFE_MERGE**

| Probe | Result |
| --- | --- |
| SAFE_FF | **NO** — `origin/alpha-0.2` is not an ancestor of feature tip |
| SAFE_MERGE | **YES** — unique delta is one file; `merge-tree` showed 0 `changed in both` / 0 conflict markers |
| NEEDS_CENTRAL_REVIEW | Optional only if Central wants to defer the workflow-rule land |
| BLOCKED | **NO** for topology/conflicts |

## Live refs (after `git fetch --all --prune`)

| Ref | SHA |
| --- | --- |
| `origin/alpha-0.2` | `e84475a769c731bb7e1ad511b3543ee714d2feea` |
| `office/profile-hero-completeness-v1` / origin twin | `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9` |
| Merge-base | `03fe5e7e78cf4239317551671c7c33206523def7` |
| Left-right `feat...alpha` | **1 / 131** |
| Product commit `3b88b01` ∈ alpha | **YES** |
| Historical tip `434ee28` ∈ alpha | **YES** |

## Supersession facts

1. **Product Hero Completeness is already on alpha.** Files from `3b88b01` (`ProfileHeader.tsx`, `profileHeroCompleteness.ts`, vitest, mock) have **empty diff** vs `origin/alpha-0.2`.
2. Prior handoff claim “next GO = FF-merge feature into alpha” is **topology-false** against live alpha (Games/AI advanced alpha by 131 commits past merge-base).
3. The only commit unique to the feature tip is:

```
7ed9159 chore(workflow): keep UMTUBA artifacts off Windows Desktop
```

Unique file:

- `.cursor/rules/umtuba-workflow.mdc` (+4 lines: ban Desktop artifact writes; protect `_port_extract`)

## Recommended Central strategies (pick one; all non-destructive until GO)

### Option A — Cherry-pick residual (preferred)

```text
git fetch --prune
git checkout alpha-0.2
git pull --ff-only
git cherry-pick 7ed9159f62d6a82d1999b19ef9d1df9a63c09de9
# expect clean apply of .cursor/rules/umtuba-workflow.mdc only
git push origin alpha-0.2
```

### Option B — Explicit merge (non-FF)

```text
git fetch --prune
git checkout alpha-0.2
git pull --ff-only
git merge --no-ff office/profile-hero-completeness-v1
# do NOT use --ff-only (will fail)
git push origin alpha-0.2
```

### Option C — Defer

If Central already enforces the Desktop-artifact rule via other docs/process, defer landing `7ed9159` and mark Hero product track **closed on alpha**. Leave feature branch as historical tip.

## Do not

- `git merge --ff-only office/profile-hero-completeness-v1` onto current alpha (will fail)
- Rebase/force-push rewriting `3b88b01`
- Silently FF local stale `alpha-0.2` (`32fb362…`, **0/207** behind origin) without pull
- Touch `_port_extract`

## Verification after land

- `git merge-base --is-ancestor 7ed9159 origin/alpha-0.2` → exit 0
- `git grep -n "Windows Desktop" origin/alpha-0.2 -- .cursor/rules/umtuba-workflow.mdc` → hits
- Product hero files unchanged vs pre-land alpha tip
