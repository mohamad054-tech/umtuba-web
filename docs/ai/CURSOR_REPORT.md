# CURSOR_REPORT — Arabic + English App Shell Translation V1

## Summary

Wired `LanguageSelector` into Settings and delivered the first visible multilingual
App Shell for Arabic and English on top of the i18n foundation. Cookie persistence
and immediate `html lang`/`dir` updates preserve RTL/LTR switching. Staged; not
committed.

## Exact files created

- `lib/i18n/shellLabels.ts`
- `lib/i18n/appShellTranslation.test.ts`

## Exact files modified

- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/fr.ts`
- `lib/i18n/messages/es.ts`
- `lib/i18n/messages/de.ts`
- `lib/i18n/messages/pt.ts`
- `lib/i18n/index.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `app/components/i18n/LanguageSelector.tsx`
- `app/components/AppTopNav.tsx`
- `app/components/AppMobileBottomNav.tsx`
- `app/components/UserMenu.tsx`
- `app/components/product/ProductEmptyState.tsx`
- `app/components/product/ProductErrorState.tsx`
- `app/components/product/ProductLoadingState.tsx`
- `app/settings/SettingsShell.tsx`
- `app/settings/SettingsExperience.tsx`
- `app/lib/nav/shellCoherence.test.ts`
- `app/lib/nav/userMenuItems.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/architecture/PLATFORM_INTERNATIONALIZATION_FOUNDATION_V1.md` (if updated)

## Architecture summary

```
Settings → LanguageSelector → umtuba_locale cookie + document.dir/lang
  → router.refresh() → resolveRequestLocale → <html lang dir> + I18nProvider
App Shell chrome (TopNav / MobileNav / UserMenu / Settings) → useTranslation()
```

## Migrations created

None.

## Security review

- No secrets; cookie SameSite=Lax; non-httpOnly by design for client preference
- Missing keys still fail safely via foundation translate()

## Tests / TypeScript / Build

`npm test -- --run lib/i18n app/lib/nav/shellCoherence.test.ts app/lib/nav/userMenuItems.test.ts`

- Test Files: **4 passed**
- Tests: **37 passed**

`npx tsc --noEmit` — **pass**

`npm run build` — **pass**

## Open issues

- Manual commit + push deferred
- FR/ES/DE/PT App Shell strings still inherit English for new shell keys
- Product feature surfaces remain untranslated (by design)
