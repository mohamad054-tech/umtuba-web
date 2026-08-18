# CURSOR_REPORT — Unified Web Locale Auto-Detection V1

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_UNIFIED_WEB_LOCALE_AUTO_DETECTION_V1
REPORT_TYPE = IMPLEMENTATION
TIMESTAMP_LOCAL = 2026-08-19 ~00:55 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
REMOTE_MIGRATION_APPLIED = NO
MOBILE_SOURCE_CHANGED = NO
MOBILE_DISTURBED = NO
PRODUCTION_LEARNING_CONTENT_REWRITTEN = NO
STORE_DEMO_PREVIEW_SET = NO
DEPLOY_PERFORMED = NO
```

## Summary

Store, Learning, and Business Sandbox already called `resolveRequestLocale()`, but they still opened in English when the device was Arabic. Root cause: the contract trusted cookie + Accept-Language + `?hl=` only. There was no `navigator.language` bridge, shopper Store routes were not `force-dynamic`, and a first-visit English HTML/cache path won over the device. Manual English already persisted via `umtuba_locale`; device locale never got a chance when Accept-Language was missing or the page was statically cached.

This wave keeps the existing i18n system and implements one priority: saved preference → URL `hl`/`locale` → device languages → English. A client `DeviceLocaleBridge` persists a supported device locale only when no cookie exists. Arabic chrome is RTL via `html[dir]` plus sandbox containers. Authored lessons and synthetic product names are unchanged.

Exercise-runtime worktree remains dirty; no Hetzner cutover.

## Exact files changed

- `lib/i18n/resolve.ts`
- `lib/i18n/deviceLocale.ts` (new)
- `lib/i18n/cookie.ts`
- `lib/i18n/server.ts`
- `lib/i18n/index.ts`
- `lib/i18n/unifiedLocaleContract.test.ts` (new)
- `lib/i18n/i18nFoundation.test.ts`
- `lib/site/hreflang.ts`
- `lib/supabase/middleware.ts`
- `app/components/i18n/DeviceLocaleBridge.tsx` (new)
- `app/components/i18n/I18nProvider.tsx`
- `app/components/i18n/LanguageSelector.tsx`
- `app/components/i18n/index.ts`
- `app/layout.tsx`
- `app/learning/loading.tsx`
- `app/store/page.tsx`
- `app/store/cart/page.tsx`
- `app/store/checkout/page.tsx`
- `app/store/orders/page.tsx`
- `app/store/search/page.tsx`
- `app/store/wishlist/page.tsx`
- `app/store/[storeSlug]/page.tsx`
- `app/sandbox/business-preview/page.tsx`
- `app/sandbox/business-preview/[...section]/page.tsx`
- `app/components/sandbox/SandboxView.tsx`
- `app/components/sandbox/SandboxShell.tsx`
- `app/components/sandbox/store/StoreShopperShell.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

No new auth, RLS, or secrets. Locale cookies stay non-httpOnly, path `/`, SameSite=lax, Secure in production. Device detection never overrides an explicit cookie. `?hl=` / `?locale=` only accept supported locales. Sandbox stays private; no public nav leak. `Vary: Accept-Language, Cookie` added so caches do not pin English HTML.

## Tests

PASS. `vitest` locale + containment + Learning chrome + hreflang suites: 89 passed. Re-run after lint helper: 40 passed.

## TypeScript

PASS. `npx tsc --noEmit` exit 0.

## Build

PASS. `npm run build` exit 0. `/store`, `/learning`, `/sandbox/business-preview` are dynamic (`ƒ`).

## git diff --check

PASS (no whitespace errors).

## git status --short

See worktree `central/unified-web-locale-auto-detection-v1` (uncommitted). Exercise worktree still has local exercise-runtime edits — not mixed.

## Open issues

- Residual English on some store-profile about/currency labels and sandbox commercial/rights internal copy. fr/es/de/pt sandbox catalogs remain partial by design.
- Auth profile locale field does not exist; reserved passthrough only.
- Deploy required to make live Arabic auto-detect. Not performed: learning exercise-runtime fix is in flight.
