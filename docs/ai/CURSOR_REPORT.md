# Cursor Report — Legal pages V1

## Summary

Replaced the live Beta legal copy on `/privacy`, `/terms`, `/account-deletion`, and `/support` with the owner-supplied English/Arabic documents. Added `/cookies`, `/community-guidelines`, `/copyright`, `/about`, and `/data-export`. No `/legal/*` routes. Shared public footer via `AppChrome`. Additive `data_export_requests` migration written and not applied.

## Exact files changed

Created:

- `legal-en.md`, `legal-ar.md` (copied from Desktop)
- `lib/legal/company.ts`
- `lib/legal/draftBanner.ts`
- `lib/legal/pageSpecs.ts`
- `lib/legal/legalMetadata.ts`
- `lib/i18n/messages/legalCatalogs.ts`
- `lib/i18n/legalCatalogs.test.ts`
- `lib/dataExport/requestDataExport.ts`
- `lib/dataExport/dataExportStore.ts`
- `lib/site/dataExportFoundation.test.ts`
- `app/components/legal/LegalDraftBanner.tsx`
- `app/components/legal/LegalRichText.tsx`
- `app/components/site/SiteFooter.tsx`
- `app/cookies/page.tsx`
- `app/community-guidelines/page.tsx`
- `app/copyright/page.tsx`
- `app/about/page.tsx`
- `app/data-export/page.tsx`
- `app/data-export/DataExportExperience.tsx`
- `app/actions/dataExport.ts`
- `supabase/migrations/20260940_data_export_requests_v1.sql`
- `docs/ai/CURRENT_TASK.md` (task overlay)
- `docs/ai/CURSOR_REPORT.md`

Modified:

- `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/support/page.tsx`
- `app/account-deletion/page.tsx`, `app/account-deletion/AccountDeletionExperience.tsx`
- `app/components/legal/LegalDocumentPage.tsx`
- `app/components/AppChrome.tsx`
- `app/lib/nav/routes.ts`
- `lib/legal/legalDocuments.ts` (old Beta sections removed)
- `lib/i18n/messages/types.ts` and all 13 catalogs (`en`, `ar`, `fr`, `es`, `de`, `pt`, `id`, `hi`, `ru`, `tr`, `zh-CN`, `ja`, `ko`)
- `lib/site/indexing.ts`, `lib/site/routeMetadata.ts`
- `lib/site/legalPages.test.ts`, `lib/site/metadata.test.ts`
- `lib/accountDeletion/accountDeletionFoundation.test.ts`

## Migrations created

`supabase/migrations/20260940_data_export_requests_v1.sql` — **not applied**. Additive queue table `data_export_requests` with the same RLS shape as `account_deletion_requests`.

## Security review

- Placeholders `[[REGISTERED ADDRESS]]` and `[[CRN]]` only; no invented company number or address.
- Export table: anon revoked; authenticated select/insert own rows; no update/delete for authenticated; trigger binds `user_id` to `auth.uid()` and forces `pending`.
- Export UI queues a pending row only. It does not generate archives or email files.
- Deletion flow still uses the existing authenticated queue. Service-role keys are not referenced.

## Tests

Focused suites PASS: legal pages, sitemap metadata, legal catalogs, data-export foundation, account-deletion foundation, i18n foundation, professional13, runtime locale certification, user-reported blockers.

## TypeScript

`npx tsc --noEmit` PASS.

## Build

`npm run build` PASS (Next.js 16.2.11). Routes present: `/privacy`, `/terms`, `/cookies`, `/community-guidelines`, `/copyright`, `/about`, `/support`, `/account-deletion`, `/data-export`. They render as dynamic (ƒ) because the root layout is already `force-dynamic` and locale is resolved from cookies/headers.

## Lint

`npm run lint` fails with **pre-existing** repo errors (56). None reported in the legal files touched by this task.

## git diff --check

PASS (no whitespace errors).

## git status --short

Uncommitted legal-page work as listed above. Not committed.

## Open issues

- `20260940` is not applied to production.
- 11 locales use English legal placeholders until translations are supplied.
- Draft banner is on (`LEGAL_DRAFT_BANNER_ENABLED = true` in `lib/legal/draftBanner.ts`).
- `/data-export` does not produce a file; it only queues a request.
- Root layout remains dynamic, so these pages are not statically prerendered.
- Full-app lint baseline is already red; this task did not clean it.

## i18n key count

**322** new keys (`legal.*`), added to `types.ts` and all 13 catalogs. English from `legal-en.md`, Arabic from `legal-ar.md`, other 11 = English placeholders.
