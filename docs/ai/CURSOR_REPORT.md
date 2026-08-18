# CURSOR REPORT

## Summary

Production Learning lesson `https://umtuba.com/learning/lessons/8934ff00-6661-42bb-92c8-efe559e76ea1` is a real published JA-09 curriculum lesson (`Lesson M01-L03 - Uncertainty, Review Loops, and Human-in-the-Loop` on `Building AI Applications (Product Patterns)`). The route exists. Anonymous GET is HTTP 200 with a Next.js redirect to `/learning/catalog?lesson=…` (catalog ignores that query). Authenticated delivery failure called `notFound()`, which is the raw Next.js 404 the user saw.

Fix (web-only, this worktree): resolve published+public lesson → course landing; guests redirect there; signed-in misses render a localized Learning unavailable/error state with return-to-course / Learning / catalog. No draft Originals published. No data change. Parallel language/login/profile tree was not touched.

## Exact files changed

- `app/learning/lessons/[lessonId]/page.tsx`
- `lib/learning/publicCatalog.ts`
- `lib/learning/publicCatalog.test.ts`
- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/fr.ts`
- `lib/i18n/messages/de.ts`
- `lib/i18n/messages/es.ts`
- `lib/i18n/messages/pt.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Public lesson lookup uses the same published+public filters as catalog. No content blocks, resources, package URLs, or service-role.
- Guests still never load lesson body.
- Draft / non-public lessons stay inaccessible; they get the Learning unavailable state instead of a generic 404.
- Query failures are classified as error, not masked as “not found”.

## Tests

PASS — `npx vitest run lib/learning/learnerDelivery.test.ts lib/learning/publicCatalog.test.ts lib/i18n/i18nFoundation.test.ts app/components/learning/learningPremiumSurfaces.test.ts lib/learning/lessonEngineFoundation.test.ts`

92 + 38 tests in those files (overlapping publicCatalog counted in both runs).

## TypeScript

PASS — `npx tsc --noEmit`

## Build

PASS — `npm run build` (route `/learning/lessons/[lessonId]` present). Pre-existing Turbopack NFT warning in `next.config.ts` / translation studio journal; unrelated.

## git diff --check

PASS

## git status --short

See commit on `central/learning-lesson-404-v1`.

## Open issues

- Authenticated production lesson open was not session-tested (no production user session on this GO).
- Learner course outline still uses `notFound()` on outline load failure (out of lesson-URL scope).
- Deploy not performed: do not race the parallel web-defects production path.
