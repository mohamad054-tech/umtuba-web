# Current Task

## COLLABORATION SoT — Playwright Login Navigation Residual Fix V1

- **Milestone:** `COLLABORATION_PLAYWRIGHT_LOGIN_NAVIGATION_RESIDUAL_FIX_V1`
- **SoT branch:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Base HEAD:** `f2e35475d9edcad8b26c4ad3d88766b7573ec955`
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`

## Status

**PREPARED_FOR_DESKTOP_VERIFICATION** — root cause addressed in product + harness;
credentialed Playwright browser runtime requires Desktop LOCAL Supabase (laptop
VT-x/Docker unavailable).

### Root cause (mixed)

1. Product: post-login soft `router.push` + `router.refresh` after cookie write
   is non-deterministic for middleware + Playwright URL observation.
2. Harness: submit then `waitForURL` without racing the click missed full-doc
   navigation readiness.

### Fix

- Login success → `window.location.assign(nextPath)` (real credentials still via
  `signInWithEmail`; no auth bypass)
- Playwright helper races submit + `waitForURL`; surfaces login alert on bounce

## Do NOT start automatically

- Commerce / advertiser bindings
- Docker / BIOS / reboot on laptop
- Production Auth / production Supabase
