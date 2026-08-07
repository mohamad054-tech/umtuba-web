# Laptop Reboot Savepoint — 2026-08-03

**Machine:** `DESKTOP-EE4G99N` / user `desktop-ee4g99n\admin`  
**Purpose:** Survive reboot; resume Collaboration without loss of pushed tip.

## Collaboration SoT (pushed)

| Item | Value |
| --- | --- |
| Branch | `office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Commit | `6b60205dfb01168552ff6344523ec3e8b22eb70e` |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |
| Sync | `0 0` with origin at feature closeout |
| Migration `20260917` | In git; **remote DB NOT APPLIED** |
| Flag | `COLLABORATION_PLATFORM_ENABLED` default false |

## Do NOT on resume without GO

- Apply `20260917` remotely
- Touch Commerce worktrees
- Merge unrelated branches

## Laptop-only loss risks (unpushed / dirty)

1. `umtuba-web-collaboration-workspace-ui-foundation-v1` — dirty `app/workspaces/layout.tsx` (tip `b002402` otherwise synced)
2. `umtuba-mobile` — dirty/untracked docs + `build.json*` (`master` @ `fe14a34`)
3. `umtuba-web` — `office/learning-ai-tutor-thread-lesson-binding-v1` @ `b85081b` **no upstream**
4. Local `.env` / `.env.local` secret files (never commit)
5. Local `node_modules` / `supabase/.temp` (reinstallable)

## After reboot

```powershell
Set-Location "C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1"
git fetch origin
git status -sb
git rev-parse HEAD
# expect 6b60205… or newer docs handoff on same branch
```

## Verdict

**SAFE_TO_REBOOT** for Collaboration feature tip.  
Central Brain full inventory pack was **incomplete** (shell harness limits); use this savepoint + git remotes as authority.
