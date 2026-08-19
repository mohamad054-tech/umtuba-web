# CURSOR REPORT — CENTRAL_PROFESSIONAL_13_LANGUAGE_LOCALIZATION_V1

## Summary

Dedicated worktree from live `f72d625a`. Thirteen-locale registry with **CHINESE_VARIANT = zh-CN** (Simplified; Traditional does not collapse). Seven new locales have professional foundation, **262-key store catalogs**, and full sandbox Learning + Store chrome overlays. Watch stays “Watch” in fr/es/de/pt; new locales use glossary verbs. Authored lessons and product names were not translated. Store/Learning restrictions and sandbox containment unchanged. Mobile not touched.

Local gates: locale/registry/completeness vitest PASS (57), `tsc --noEmit` PASS, changed-file eslint PASS, local `next build` PASS. Full-repo eslint still reports 54 pre-existing errors on the live SHA (not introduced here).

## Exact files changed

- `lib/i18n/locales.ts`, `lib/i18n/index.ts`, `messages/types.ts`, `messages/catalogs.ts`
- `lib/i18n/messages/{id,hi,ru,tr,zh-CN,ja,ko}.ts` — foundation + store spread
- `lib/i18n/messages/storeCatalogs.ts` — seven native 262-key store exports
- Existing six catalogs: language-name keys only for the seven added locales
- `lib/i18n/professional13Catalog.test.ts` and foundation/unified/store/studio tests
- `lib/world/catalogLocales.ts`, `cityCatalogCopy.test.ts`, `data/world/catalog/city-copy-v2.json`, `scripts/world/expansionV2Data.ts`
- `lib/translationStudio/professionalQuality/styleGuides.ts`, `thresholds.ts`
- `lib/sandbox/i18n.ts`, `lib/sandbox/store/messages.ts`, `lib/sandbox/learning/i18n.learning.test.ts`
- `app/globals.css` — CJK/Hindi system font stacks
- `docs/i18n/TERMINOLOGY.md`, `docs/ai/CURRENT_TASK.md`
- `scripts/i18n/**` — catalog generator (not runtime)

## Migrations created

None.

## Security review

No secrets printed or committed. Host build must source `/etc/umtuba/production/umtuba.env` and abort if URL/key missing (lengths only). `STORE_DEMO_PREVIEW` and sandbox token stay unset. No Store/Learning access change. Sandbox remains private. Authored lessons/posts/DMs/seller copy untouched. Rollback target is live `f72d625a-20260819151734`. Never restore `0b6d35bd-20260819011723`.

## Tests

`npx vitest run` on locale/registry/completeness files: **57 passed** (6 files).

- `lib/i18n/professional13Catalog.test.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `lib/i18n/unifiedLocaleContract.test.ts`
- `lib/i18n/storeLocalization.test.ts`
- `lib/sandbox/learning/i18n.learning.test.ts`
- `lib/translationStudio/translationStudioFoundation.test.ts`

## TypeScript

`npx tsc --noEmit` — PASS

## Build

Local `npm run build` — PASS (Next.js 16.2.10). Host env-sourced build is the deploy gate.

## git diff --check

Run at commit time.

## git status --short

Worktree dirty on i18n + docs + generator until the product commit.

## Open issues

- Authored lesson bodies and synthetic/demo product names remain source-language (intentional).
- `Hello City` stays Latin in the six LTR locales; new locales use native labels.
- Full-repo `npm run lint` still has 54 pre-existing errors from live `f72d625a`.
- Deploy status is recorded after the host cutover.
