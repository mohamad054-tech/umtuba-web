# Current Task

## Task title

Platform Internationalization Foundation V1

## Status

`implementation-complete` — Shared i18n foundation staged for manual commit (no trailers). Not pushed.

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-platform-i18n-foundation-v1`
2. Branch: `office/platform-internationalization-foundation-v1` (from Local Adapter tip `a462c88`)
3. Manual commit (no Co-authored-by / Signed-off-by / trailers)
4. Push when approved; confirm `0 0`
5. Do **not** merge into alpha without explicit GO

## Branch

`office/platform-internationalization-foundation-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `a462c88bd446c794f7b81f2e8219f3e4b866e971` (Local Adapter V1) |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-platform-i18n-foundation-v1` |

## Allowed scope

- Shared i18n foundation (`lib/i18n/**`, root layout lang/dir, reusable selector/provider, focused tests, AI/platform handoff + architecture docs)

## Forbidden scope

- Full translation of Home / Learning / Commerce / Creator / Live / Games / World / Profile
- Database migrations / inventing user locale persistence
- Redesign / unrelated UI wiring
- AI provider changes
- Route-wide `[locale]` URL migration
- Commit/push without GO

## Done

- Locale contract: `ar|en|fr|es|de|pt`, RTL for Arabic, LTR otherwise
- Fail-safe resolution: explicit → userPreference → cookie → Accept-Language → `en`
- Root layout sets `html lang` + `dir`; `I18nProvider` for client hooks
- Foundation catalogs (6 locales) + typed `translate` / `useTranslation`
- Format helpers (date/number/percent/currency) — presentation only
- `LanguageSelector` component created, **not** wired into Settings screens
- Tests + `tsc` + build pass

## Out of scope / next

Settings language section wiring, DB preference, full-surface translation, alpha merge.
