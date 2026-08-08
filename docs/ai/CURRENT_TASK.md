# Current Task

## COLLABORATION SoT — Login Client Navigation Fix V1

- **Milestone:** `COLLABORATION_LOGIN_CLIENT_NAVIGATION_FIX_V1`
- **SoT branch:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Base HEAD:** `47e8251b61819574ac640c2047d6996f9539951b`
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`

## Status

**DESKTOP_LOCAL_RUNTIME_REVERIFICATION_REQUIRED**

### Desktop runtime evidence consumed

`LOGIN_NAV_FAIL_RUNTIME_AUTH_HARD_NAV_PASS`:
- Auth password grant 200 · cookie present · session PASS
- Soft client leave-/login FAIL · URL stayed `/login`
- Hard goto settings with same session PASS · learning UI visible
- Playwright official spec FAIL only at `waitForURL` leaving `/login`

### Root cause

After `signInWithEmail`, login **awaited** `claimPendingReferralAction()` before
`window.location.assign`. Auth was already healthy; a blocking/hung claim
prevented leave-/login. `47e8251` hard-nav alone was insufficient.

### Fix

- Keep full-document `window.location.assign(nextPath)` after auth
- Kick off referral claim with `void` (non-blocking); bootstrap remains backstop
- No auth bypass; middleware unchanged

## Do NOT start automatically

- Commerce / advertiser bindings
- Docker / BIOS on laptop
- Production Supabase
