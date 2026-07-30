# Platform Internationalization Foundation V1

## Status

Implementation complete on `office/platform-internationalization-foundation-v1` (staged; awaiting commit GO).

## Goal

Shared locale + translation foundation so UMTUBA can support Arabic, English,
French, Spanish, German, and Portuguese without translating every product surface
in this milestone.

## Architecture (selected)

**Lightweight custom `lib/i18n` + root-layout locale awareness** — no `next-intl`
/ `react-intl` dependency and **no `[locale]` URL segment migration**.

Why:
- Current stack has no i18n library and hardcodes `lang="en"` in root layout.
- Route-prefix migration would be a breaking URL change (explicitly excluded).
- Cookie + Accept-Language resolution is enough for foundation V1.
- No DB user-locale column exists; inventing migrations is out of scope.

```
Request
  → resolveRequestLocale()  // cookie → Accept-Language → en
  → <html lang dir>
  → I18nProvider(locale)
  → createTranslator / useTranslation / LanguageSelector (unwired)
```

## Supported locales

| Code | Direction | Notes |
| --- | --- | --- |
| `ar` | RTL | Arabic |
| `en` | LTR | Default / fallback |
| `fr` | LTR | French |
| `es` | LTR | Spanish |
| `de` | LTR | German |
| `pt` | LTR | Portuguese |

## Resolution order

1. Explicit override (caller)
2. Authenticated user preference (passthrough only — no DB contract in V1)
3. Cookie `umtuba_locale`
4. Browser / `Accept-Language`
5. Fallback `en`

## Translation surface (V1)

- Language names
- Common actions: Save, Cancel, Continue, Back, Retry, Close
- Loading / empty / error status strings
- Settings language labels

## Deferred

- Full product-surface translation
- Settings screen wiring of `LanguageSelector`
- DB persistence of user locale
- Locale URL prefixes
- AI provider / Learning / Commerce copy
