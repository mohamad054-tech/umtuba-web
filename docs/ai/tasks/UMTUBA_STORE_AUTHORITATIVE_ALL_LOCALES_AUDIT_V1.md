# UMTUBA_STORE_AUTHORITATIVE_ALL_LOCALES_AUDIT_V1

Read-only. No Gemini. No catalog/i18n source change. No backfill.

## Required report

```text
TASK_ID = UMTUBA_STORE_AUTHORITATIVE_ALL_LOCALES_AUDIT_V1
STATUS = AUDIT_COMPLETE
WEB_SUPPORTED_LOCALES = ar,en,fr,es,de,pt,id,hi,ru,tr,zh-CN,ja,ko
MOBILE_SUPPORTED_LOCALES = ar,en,fr,es,de,pt
USER_SELECTABLE_LOCALES = ar,en,fr,es,de,pt,id,hi,ru,tr,zh-CN,ja,ko
TRANSLATION_RESOURCES_FOUND = web_newer:13_foundation+store_chrome; mobile_localized:6; this_worktree:6
UMTUBA_ALL_SUPPORTED_LOCALES = ar,en,fr,es,de,pt,id,hi,ru,tr,zh-CN,ja,ko
TOTAL_SUPPORTED_LOCALE_COUNT = 13
STORE_REQUIRED_LOCALES = ar,en,fr,es,de,pt,id,hi,ru,tr,zh-CN,ja,ko
STORE_REQUIRED_LOCALE_COUNT = 13
PREVIOUS_6_LOCALE_SOURCE = this-worktree lib/i18n/locales.ts SUPPORTED_LOCALES (also LanguageSelector, Translation Studio, requiredLocales.ts, i18nFoundation.test.ts)
WHY_PREVIOUS_LIST_WAS_INCOMPLETE = Store localization ran inside umtuba-web-translation-trunk-port-v1, which still has the V1 six-locale contract. Newer web clones already expanded SUPPORTED_LOCALES to 13 and wired catalogs + Settings picker. Architecture V1 markdown was never updated, so a single-file read of locales.ts / PLATFORM_INTERNATIONALIZATION_FOUNDATION_V1.md looked complete and was not.
FILES_CHECKED = see below
CONFLICTING_LOCALE_CONFIGS = this-worktree=6; translation-sot=6; older-web-Aug30=6; newer-web-from-Aug31=13; mobile-localized=6; main-umtuba-mobile=none; architecture-V1-doc=6; TERMINOLOGY.md=13; zh-TW reserved-not-landed; Learning partners en|ar only
AUTHORITATIVE_SOURCE_OF_TRUTH = newer-web lib/i18n/locales.ts + i18nFoundation.test.ts ("thirteen platform locales") + lib/i18n/messages/catalogs.ts + Settings LanguageSelector + docs/i18n/TERMINOLOGY.md. Best on-disk: umtuba-um-streak-final-completion-v1 @ 28a4c2a6 (2026-09-05); also 3ccc164f / social-comm / central-integration / um-streak-social-camera
SOURCE_CHANGED = NO
STORE_CATALOG_CHANGED = NO
GEMINI_CALLED = NO
LIVE_DEPLOY = NO
BLOCKERS = this Store worktree still types AppLocale as 6; mobile still 6; existing 532 products are AR+EN only. Do not start 13-locale backfill until owner GO.
NEXT_ACTION = OWNER_REVIEW_BEFORE_ALL_LANGUAGE_BACKFILL
```

## Why the previous Store task saw only six

The previous Store task (`UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1` and the cancelled 532 backfill) treated **this worktree** as the platform contract:

- `lib/i18n/locales.ts` → `SUPPORTED_LOCALES = ["ar","en","fr","es","de","pt"]`
- `lib/store/productLocalization/requiredLocales.ts` copies that array
- Settings `LanguageSelector` calls `listSupportedLocales()` from the same file
- `lib/translationStudio/languages.ts` maps the same six
- `lib/i18n/i18nFoundation.test.ts` asserts exactly those six and rejects `zh`

That is the V1 foundation. It is **real and wired here**, but it is **not** the current UMTUBA product locale set. Newer web trees already landed seven more locales with catalogs and a selectable Settings picker. The owner instruction stands: do not treat absence from this file as absence from the product.

## Authoritative list

`UMTUBA_ALL_SUPPORTED_LOCALES` = every locale that is a first-class `AppLocale` on current web (code contract + real message catalogs + user-selectable LanguageSelector).

| code | name | web | mobile | resources | selectable | store-required |
| --- | --- | --- | --- | --- | --- | --- |
| `ar` | Arabic (RTL) | YES | YES | YES | YES | YES |
| `en` | English (default) | YES | YES | YES | YES | YES |
| `fr` | French | YES | YES | YES | YES | YES |
| `es` | Spanish | YES | YES | YES | YES | YES |
| `de` | German | YES | YES | YES | YES | YES |
| `pt` | Portuguese (pt-BR copy; code stays `pt`) | YES | YES | YES | YES | YES |
| `id` | Indonesian | YES (newer web) | NO | YES (web) | YES (web) | YES |
| `hi` | Hindi | YES (newer web) | NO | YES (web) | YES (web) | YES |
| `ru` | Russian | YES (newer web) | NO | YES (web) | YES (web) | YES |
| `tr` | Turkish | YES (newer web) | NO | YES (web) | YES (web) | YES |
| `zh-CN` | Chinese (Simplified) | YES (newer web) | NO | YES (web) | YES (web) | YES |
| `ja` | Japanese | YES (newer web) | NO | YES (web) | YES (web) | YES |
| `ko` | Korean (ko-KR UI) | YES (newer web) | NO | YES (web) | YES (web) | YES |

`pt` is one locale. Copy is Brazilian (`Salvar`, not pt-PT). Do not add `pt-BR` as a second Store locale.

## Explicitly not supported (do not add)

| code | why excluded |
| --- | --- |
| `zh-TW` | `FUTURE_LOCALE_CODES` only. No catalog. `isAppLocale("zh-TW") === false`. Traditional must not collapse onto Simplified. |
| `zh` | Not an `AppLocale`. `zh` / `zh-Hans` normalize to `zh-CN`. World city-copy key alias only. |
| `it`, `he`, `fa`, `ur`, `nl`, … | Not in any wired `SUPPORTED_LOCALES`. Mentioned only as unsupported-device fallback examples. |
| Learning `en` \| `ar` | Partner-course content locale, not the app language list. |
| Profile `kind: "language"` tags | Free-text profile chips, not app locales. |
| Journey “Turkish” / “View in Turkish” | Authored content language on a sample post, not a selectable app locale on mobile’s 6-locale builds. |

## Web vs mobile vs this worktree

| Surface | Locales | Selectable? | Resources |
| --- | --- | --- | --- |
| Newer web (UM Streak / 3ccc164f / central-integration / social-comm) | 13 | Settings `LanguageSelector` lists all 13 | Foundation catalogs + Store chrome catalogs for all 13 |
| **This Store worktree** (`umtuba-web-translation-trunk-port-v1`) | 6 | Settings lists 6 | Foundation `ar,en,fr,es,de,pt` only. No `id.ts` / `hi.ts` / … |
| Mobile localized iOS builds (Build 6 → Build 29) | 6 | `app/language.tsx` from `listSupportedLocales()` | `src/lib/i18n/messages/{ar,en,fr,es,de,pt}.ts` |
| Main `umtuba-mobile` @ `77e9e28` | none | Settings Language is a static `"English"` info row | No i18n layer |
| UM Life mobile clones | none | no `locales.ts` | none |

### Owner-decision gaps

- **Web-only (7):** `id`, `hi`, `ru`, `tr`, `zh-CN`, `ja`, `ko` — customer-selectable on current web with real dictionaries; **not** on mobile localized builds.
- **Worktree lag:** this Store repo still compiles `AppLocale` as the old six. A 13-locale Store backfill cannot type-check here until this tree ports the 13-locale contract (out of scope for this audit).
- **Mobile-only:** none. Mobile is a subset of web.
- **Store product JSON in this tree:** original 532 are AR+EN legacy fields; the 8 new expansion rows have `by_locale` for the old six only.

## STORE_REQUIRED_LOCALES recommendation

Require all **13** `USER_SELECTABLE` locales that are wired on web with real dictionaries.

Rationale: a complete customer-facing catalog must match every language a shopper can pick in Settings on current web. Intersection-with-mobile (6) would leave Indonesian / Hindi / Russian / Turkish / Simplified Chinese / Japanese / Korean storefronts showing English/source product copy.

Do **not** require `zh-TW` until a catalog exists and it is selectable.

## Files checked

### This worktree (6-locale, stale for product truth)

- `lib/i18n/locales.ts`
- `lib/i18n/messages/{ar,en,fr,es,de,pt,catalogs,types}.ts`
- `lib/i18n/resolve.ts`, `lib/i18n/cookie.ts`, `lib/i18n/i18nFoundation.test.ts`
- `app/components/i18n/LanguageSelector.tsx`
- `app/settings/SettingsExperience.tsx`
- `lib/translationStudio/languages.ts`, `lib/translationStudio/types.ts`
- `lib/store/productLocalization/requiredLocales.ts`
- `docs/architecture/PLATFORM_INTERNATIONALIZATION_FOUNDATION_V1.md`
- `docs/ai/PC2_A3_MOBILE_LOCALIZATION_PARITY_PREP.md`
- `docs/ai/PC2_IOS_LOCALIZATION_BUILD6_REPORT.md`
- `supabase/migrations/20260910_translation_studio_persistence_workflow_v1.sql` (languages table is free-text PK, no seeded list)
- Learning partner copy (`en` \| `ar` only)
- Profile about languages (free-text tags)

### Newer web clones (13-locale, authoritative)

- `C:/Users/Giga store/Desktop/umtuba/umtuba-um-streak-final-completion-v1/lib/i18n/locales.ts` @ `28a4c2a6` 2026-09-05
- `C:/Users/Giga store/Desktop/umtuba/umtuba-web-3ccc164f-clean-build` @ `3ccc164f` 2026-09-02
- `C:/Users/Giga store/Desktop/umtuba/umtuba-web-social-comm-rich-profile-renumber-integrate-v1` @ `3ccc164f`
- `C:/Users/Giga store/Desktop/umtuba/umtuba-web-um-streak-social-camera-v1` @ `b0146a71` 2026-09-02
- `C:/Users/Giga store/Desktop/umtuba/umtuba-web-central-integration-candidate-v1` @ `75b3896c` 2026-08-31
- Same trees: `lib/i18n/messages/catalogs.ts`, `{id,hi,ru,tr,zh-CN,ja,ko}.ts`, `storeCatalogs.ts` (13 Store chrome packs), `LanguageSelector.tsx`, `SettingsExperience.tsx`, `lib/i18n/i18nFoundation.test.ts`, `docs/i18n/TERMINOLOGY.md`

### Older web clones still on 6

- this worktree @ `196a0358` 2026-08-31 (comms port)
- `umtuba-web-translation-sot` @ `0999fc1d` 2026-08-09
- `umtuba-web-official-logo-approved-video-v1` @ `2c75f7b2` 2026-08-29
- `umtuba-web-um-life-09155b15` @ `09155b15` 2026-08-30
- `umtuba-web-um-life-home-entry-v1` @ `ab3f7b03` 2026-08-30

### Mobile

- `umtuba-mobile` main @ `77e9e28` — no `src/lib/i18n`
- `umtuba-mobile-pc2-ios-localization-build6-v1` through `umtuba-mobile-pc2-ios-build29-17cbfef-v1` — `SUPPORTED_LOCALES` = six; catalogs for six; `app/language.tsx` selectable
- `umtuba-mobile-um-life-home-entry-v1`, `umtuba-mobile-um-streak-integration-v1` — no `locales.ts`
- `D:\umtuba-central\FROM-PC2` — PC2 return notes only; no locale registry

## Conflicting configs (do not pick one blindly)

1. **This Store worktree / translation-sot / Aug-29–30 web** = 6
2. **Web from central-integration / UM Streak / 3ccc164f onward** = 13
3. **Mobile localized** = 6 (subset)
4. **`docs/architecture/PLATFORM_INTERNATIONALIZATION_FOUNDATION_V1.md`** = 6 even inside 13-locale clones (stale V1 write-up)
5. **`docs/i18n/TERMINOLOGY.md`** = 13 (matches landed code)
6. **`lib/store/productLocalization/requiredLocales.ts` in this tree** = 6 (derived from stale contract)

Truth for Store: **13**, from the landed newer-web contract, not from this worktree’s `locales.ts`.
