# CURSOR_REPORT_DESKTOP_A3

TASK_ID = DESKTOP_A3_SHARED_RUNTIME_PERFORMANCE_ACCESSIBILITY_QA_V1  
DATE = 2026-08-15  
Sidecar only — does **not** replace `docs/ai/CURSOR_REPORT.md`.

## Summary

Production shared-shell QA on `https://umtuba.com` vs `origin/alpha-0.2` `3bc0b95554f7c59ed174903c448011632faaf4d9`. Browser MCP failed (tabs vanish); Playwright evidence in `docs/ops/closeout/a3-shared-qa/`. No P0. P1 auth focus + mobile chrome clip found. Safe shared fixes left **uncommitted** on `worktrees/DESKTOP-A3-SHARED-QA`. Existing seller A3 worktree untouched. **FINAL_VERDICT = PARTIAL**.

## Exact files changed

Fix worktree `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A3-SHARED-QA` (15 files, +62/−15):

- `app/components/AppChrome.tsx`
- `app/components/AppTopNav.tsx`
- `app/components/UserMenu.tsx`
- `app/components/auth/AuthField.tsx`
- `app/components/auth/AuthShell.tsx`
- `app/login/page.tsx`
- `app/signup/SignupForm.tsx`
- `app/support/page.tsx`
- `app/account-deletion/AccountDeletionExperience.tsx`
- `app/components/legal/LegalDocumentPage.tsx`
- `app/globals.css`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/appShellTranslation.test.ts`

Main-repo docs only (this task):

- `docs/ops/closeout/DESKTOP_A3_SHARED_RUNTIME_PERFORMANCE_ACCESSIBILITY_QA_V1.md`
- `docs/ops/closeout/a3-shared-qa/run-prod-qa.mjs`
- `docs/ops/closeout/a3-shared-qa/prod-qa-evidence.json`
- `docs/ai/CURSOR_REPORT_DESKTOP_A3.md`

## Migrations created

None.

## Security review

No secrets exposed. Guest UserMenu log downgraded only. No RLS/auth contract change.

## Tests

- i18n appShell + foundation + authLocale: **30/30 PASS**
- signup contract: **1/1 PASS**

## TypeScript

`npx tsc --noEmit` **PASS** (fix worktree).

## Build

`npm run build` **PASS** (fix worktree). Pre-existing translation-studio NFT warning only.

## git diff --check

Clean (fix worktree).

## git status --short

Fix worktree: 15 modified files listed above; **no commit**.  
Main: closeout/evidence/sidecar added; unrelated dirty WIP preserved.

## Open issues

- Uncommitted delta not on production.
- Home RTL `h1` still `"Home"`; 404 English; welcome WebGL; home cold TTFB ~4s — handoffs.
- Browser MCP unavailable this session.

## Final verdict

```
SOURCE_SHA = 3bc0b95554f7c59ed174903c448011632faaf4d9
PRODUCTION_TESTED = YES
RESPONSIVE = PARTIAL
PERFORMANCE = PARTIAL
ACCESSIBILITY = PARTIAL
RTL_LTR = PARTIAL
RUNTIME_ERRORS = PARTIAL
FIXES = YES_UNCOMMITTED
TESTS = PASS
COMMIT_SHA = none
RELEASE_BLOCKERS = NONE_P0
FINAL_VERDICT = PARTIAL
```
