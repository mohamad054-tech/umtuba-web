# Cursor report — legal public surfaces

## Summary

Implemented the nine public legal surfaces on `fix/legal-public-surfaces` from `origin/alpha-0.2` (`9080b79c`) in worktree `C:/Users/Giga store/Desktop/umtuba/umtuba-legal`. Existing `/privacy`, `/terms`, `/account-deletion`, and `/support` were replaced. New routes: `/cookies`, `/community-guidelines`, `/copyright`, `/about`, `/data-export`. No `/legal/*` routes. No commit, push, or `supabase db push`. Not deployed.

**Source files:** `legal-en.md` and `legal-ar.md` were not found at repo root, Desktop, Downloads, docs/, or the worktree. Body copy is a conservative draft from owner-stated facts only (`UMTUBA Limited (in registration, Republic of Ireland)`, `/support`, queued delete/export). Replace `lib/i18n/messages/legalCatalogs.ts` when the owner drops the markdown files.

## Exact files changed

Created:

- `lib/legal/company.ts`
- `lib/legal/loadLegalPage.ts`
- `lib/i18n/messages/legalCatalogs.ts`
- `lib/dataExport/requestDataExport.ts`
- `lib/dataExport/dataExportStore.ts`
- `lib/dataExport/dataExportFoundation.test.ts`
- `app/components/legal/AppFooter.tsx`
- `app/components/legal/LegalDraftBanner.tsx`
- `app/components/legal/LegalTranslationDisclaimer.tsx`
- `app/components/legal/legalBody.tsx`
- `app/about/page.tsx`
- `app/cookies/page.tsx`
- `app/community-guidelines/page.tsx`
- `app/copyright/page.tsx`
- `app/data-export/page.tsx`
- `app/data-export/DataExportExperience.tsx`
- `app/actions/dataExport.ts`
- `supabase/migrations/20260940_data_export_requests_v1.sql`

Changed:

- `lib/legal/legalDocuments.ts` (Beta copy removed)
- `app/components/legal/LegalDocumentPage.tsx`
- `app/components/AppChrome.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `app/support/page.tsx`
- `app/account-deletion/page.tsx`
- `app/account-deletion/AccountDeletionExperience.tsx`
- `app/lib/nav/routes.ts`
- `lib/site/indexing.ts`
- `lib/site/routeMetadata.ts`
- `lib/site/legalPages.test.ts`
- `lib/site/metadata.test.ts`
- `lib/accountDeletion/accountDeletionFoundation.test.ts`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/fr.ts`
- `lib/i18n/messages/es.ts`
- `lib/i18n/messages/de.ts`
- `lib/i18n/messages/pt.ts`
- `lib/i18n/messages/id.ts`
- `lib/i18n/messages/hi.ts`
- `lib/i18n/messages/ru.ts`
- `lib/i18n/messages/tr.ts`
- `lib/i18n/messages/zh-CN.ts`
- `lib/i18n/messages/ja.ts`
- `lib/i18n/messages/ko.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

- `supabase/migrations/20260940_data_export_requests_v1.sql` — additive `data_export_requests` (same shape/RLS as `account_deletion_requests`). **Not applied.** `20260939` is not on this branch; file is numbered `20260940` as instructed.

## Security review

- Anon: no SELECT/INSERT/UPDATE/DELETE on `data_export_requests`.
- Authenticated: SELECT/INSERT own rows only; trigger forces `user_id = auth.uid()` and `status = pending`.
- No authenticated UPDATE/DELETE policies.
- UI queues PENDING only. No export generation.
- Address and CRN stay `[[REGISTERED ADDRESS]]` / `[[CRN]]` in `lib/legal/company.ts` only.
- No secrets printed. No production DB connection.

## Tests

- `lib/site/legalPages.test.ts` — pass
- `lib/dataExport/dataExportFoundation.test.ts` — pass
- `lib/accountDeletion/accountDeletionFoundation.test.ts` — pass
- `lib/site/metadata.test.ts` — pass
- `lib/i18n/professional13Catalog.test.ts` + `lib/i18n/i18nFoundation.test.ts` — pass (30)

HTTP smoke on `http://127.0.0.1:3010` (dev server in this worktree):

| Route | Status | Draft | Company | Placeholders | Beta text |
|---|---|---|---|---|---|
| `/privacy` | 200 | yes | yes | yes | no |
| `/terms` | 200 | yes | yes | yes | no |
| `/cookies` | 200 | yes | yes | yes | no |
| `/privacy?hl=ar` | 200 | AR draft | yes | yes | no; RTL; EN disclaimer hidden, AR disclaimer shown |
| `/community-guidelines` | 200 | yes | yes | yes | no |
| `/copyright` | 200 | yes | yes | yes | no |
| `/about` | 200 | no | yes | yes | no |
| `/support` | 200 | no | yes | yes | no |
| `/account-deletion` | 200 | no | yes | yes | no |
| `/data-export` | 200 | no | yes | yes | no |

Browser MCP tabs were unavailable; verification was HTTP + HTML, not click-through.

## TypeScript

`npx tsc --noEmit` — **PASS** (exit 0)

## Build

`npm run build` — **PASS** (exit 0). All nine legal routes present. They are dynamic (`ƒ`) because root layout is `force-dynamic` and locale uses cookies/`?hl=`. Indexable via existing `buildPageMetadata` + sitemap.

## git diff --check

**PASS** (exit 0)

## git status --short

Uncommitted on `fix/legal-public-surfaces`. See files above. `node_modules` installed in the worktree for build (not staged).

## i18n keys added

**58** new keys (`LegalMessages` in `types.ts`, present in all 13 catalogs).

- `en`: English draft (source markdown missing)
- `ar`: Arabic draft (source markdown missing)
- fr, es, de, pt, id, hi, ru, tr, zh-CN, ja, ko: English placeholders

Existing keys were not renamed or changed in meaning.

## Placeholders

| Token | Where |
|---|---|
| `[[REGISTERED ADDRESS]]` | `lib/legal/company.ts` → interpolated as `{registeredAddress}` |
| `[[CRN]]` | `lib/legal/company.ts` → interpolated as `{crn}` |
| `[[TO BE PROVIDED]]` | `LEGAL_EFFECTIVE_DATE` and `LEGAL_LAST_UPDATED` in `lib/legal/company.ts` |

No other `[[TO BE PROVIDED]]` in page bodies.

Draft banner switch: `LEGAL_DRAFT_BANNER_ENABLED` in `lib/legal/company.ts`.

## Open issues

- Owner `legal-en.md` / `legal-ar.md` were not on disk; replace catalog bodies when supplied.
- 11 locales still English placeholders (owner will supply translations).
- Draft banner still on; not binding.
- Address / CRN / dates still placeholders.
- Migration not applied to any database.
- Full-repo `npm run lint` fails on **pre-existing** alpha-0.2 issues (57 errors). Scoped eslint on legal files: **PASS**.
- Browser MCP could not open a tab; pages verified over HTTP.

## NEXT_ACTION

1. Drop `legal-en.md` and `legal-ar.md` if they differ from this draft, then replace `legalCatalogs.ts` bodies.
2. Supply translations for the 11 non-en/ar locales.
3. Legal review; then set `LEGAL_DRAFT_BANNER_ENABLED = false` when counsel says so.
4. Fill `[[REGISTERED ADDRESS]]` and `[[CRN]]` in `lib/legal/company.ts` only — do not invent them.
5. Commit / push only when the owner says so.
6. Apply `20260940` only when the owner authorizes a migration (not `supabase db push` unless they say so).
