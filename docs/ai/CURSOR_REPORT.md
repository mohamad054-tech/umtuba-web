# CURSOR_REPORT — CENTRAL_AUTH_LOCALE_P1_SUPPORT_CLOSEOUT_V2

## Summary

Surgical P1 closeout: Login/Signup body now follows locale via `useTranslation` + `auth.*` keys; public `/support` shipped and deployed. Production verified FIXED_VERIFIED. STOP.

## Exact files changed

- `app/components/auth/AuthShell.tsx`
- `app/login/page.tsx`
- `app/signup/SignupForm.tsx`
- `app/signup/SignupLoadingFallback.tsx` (new)
- `app/signup/page.tsx`
- `app/signup/SignupForm.contract.test.ts`
- `app/support/page.tsx` (new)
- `app/lib/nav/routes.ts`
- `lib/i18n/messages/{types,en,ar,fr,es,de,pt}.ts`
- `lib/i18n/authLocaleBody.test.ts` (new)
- `lib/support/supportPage.ts` (new)
- `lib/legal/legalDocuments.ts`
- `lib/site/{indexing,routeMetadata,legalPages.test}.ts`

## Migrations created

None.

## Security review

- No secrets committed.
- `/support` public by design; no invented mailbox; uses live `/account-deletion`, `/privacy`, `/terms`, `/login`.
- Auth validation error strings left English (not in this P1 body scope).

## Tests

`npx vitest run` targeted: **37/37 PASS** (authLocaleBody, i18nFoundation, appShellTranslation, legalPages, SignupForm.contract).

## TypeScript

`npx tsc --noEmit` — **PASS**

## Build

`npm run build` — **PASS** (route `/support` present)

## git diff --check

**PASS**

## git status --short

Clean on branch after commit `3bc0b955` pushed to `origin/alpha-0.2`.

## Open issues

- Unrelated retained: AUTH_ENV=NO; Android v5 deposit absent; iOS EAS_AUTH absent; World HOLD.
- Do not reopen Search/AASA/World/general Translation.
