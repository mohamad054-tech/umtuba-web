# CURSOR_REPORT — Login Client Navigation Fix V1

## Summary

**DESKTOP_LOCAL_RUNTIME_REVERIFICATION_REQUIRED** — Product login no longer awaits
referral claim before full-document navigation after successful sign-in. Matches
Desktop evidence: session/cookie healthy while URL remained `/login`.

## Exact files changed

- `app/login/page.tsx`
- `lib/supabase/authSession.harden.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`

## Migrations created

NO

## Security review

- Still real `signInWithEmail` + `getSafeRedirectPath`
- No auth bypass / no storageState / no privileged test branch
- Middleware/auth guards unchanged
- Referral claim still attempted (non-blocking) + ReferralClaimBootstrap

## Tests

- Focused auth/harden + referral + Collaboration Vitest: **49/49 PASS**
- Credentialed Playwright: **NOT RUN on laptop**

## TypeScript

- `npx tsc --noEmit` → PASS

## Build

N/A

## git diff --check

PASS

## git status --short

(see closeout)

## Open issues

Desktop must re-verify Playwright learning-link-unlink smoke leaves `/login`.
