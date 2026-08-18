# CURSOR REPORT

## Summary

JA-09 (`Building AI Applications (Product Patterns)`, slug `ja-09`) is a published public catalog course shown as Free with a Start Course CTA. Authenticated self-enroll failed with the SQL exception `Not eligible to self-enroll in this course`.

Root cause: `can_enroll_in_learning_course` required `learning_course_settings.allow_self_enroll = true` and treated `require_program_enrollment` (default true) as a program-access gate. Course create inserts settings with those reserved-slice defaults. Public catalog cannot reliably read settings (RLS), so `resolvePublicIsFree` treats unknown settings + `marketplace_ready !== true` as Free and always offered Start Course. Intended model is PUBLIC_FREE_SELF_ENROLL.

Fix (this worktree only, from production SHA `e6b23cc388ddb5e452a405d24d714a5f5bc67818`):
- Migration `20260930` replaces `can_enroll_in_learning_course` so published + public + not marketplace_ready courses are authenticated self-enrollable, while private/cohort/paid still use settings flags. Backfills settings for matching public free courses.
- Enroll action maps RPC errors to i18n codes and returns to the requested lesson UUID when present.
- Authenticated unenrolled lesson deep link keeps lesson identity and offers enroll-and-open-lesson (or an honest restricted panel).
- Learning product chrome localized for ar/en/fr/es/de/pt. Authored course/lesson titles are not machine-translated.

Store files were not touched. Mobile `7cf3960` was not touched. SQL `20260929` was not created or applied. Deploy not performed (Store wave `46c941f7` is undeployed; this fix needs a remote migration apply; authenticated browser MCP absent).

## Exact files changed

- `supabase/migrations/20260930_learning_public_catalog_self_enroll_v1.sql`
- `lib/learning/publicCatalogSelfEnroll.ts`
- `lib/learning/publicCatalogSelfEnroll.test.ts`
- `lib/learning/publicCatalog.ts`
- `lib/learning/publicCatalog.test.ts`
- `lib/learning/learnerDelivery.test.ts`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/fr.ts`
- `lib/i18n/messages/es.ts`
- `lib/i18n/messages/de.ts`
- `lib/i18n/messages/pt.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `app/learning/catalog/actions.ts`
- `app/learning/catalog/page.tsx`
- `app/learning/catalog/[courseSlug]/page.tsx`
- `app/learning/lessons/[lessonId]/page.tsx`
- `app/learning/page.tsx`
- `app/learning/courses/[courseId]/page.tsx`
- `app/components/learning/LearningShell.tsx`
- `app/components/learning/CatalogBrowser.tsx`
- `app/components/learning/LessonViewer.tsx`
- `app/components/learning/LearningHub.tsx`
- `app/components/learning/CourseOutline.tsx`
- `app/components/learning/ProgressSummary.tsx`
- `app/components/learning/ActivityList.tsx`
- `app/components/learning/learningPremiumSurfaces.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

- `20260930_learning_public_catalog_self_enroll_v1.sql` — not applied remotely.

## Security review

- Enrollment still requires `auth.uid()`, published course+program, active space.
- Public-free path requires public visibility on course/program/space and `marketplace_ready is not true`.
- Settings-flag path unchanged for private/cohort/paid.
- Function remains SECURITY DEFINER with `search_path = public`; revoke public/anon; grant authenticated + service_role only.
- No RLS weakening. No service-role enroll from the app. No anonymous enroll.
- Settings backfill limited to published public non-marketplace courses in a public active space.

## Tests

Relevant: PASS — 149 tests
`publicCatalogSelfEnroll`, `publicCatalog`, `enrollmentsFoundation`, `i18nFoundation`, `learnerDelivery`, `learningPremiumSurfaces`.

Full `npx vitest run`: 4180 passed, 4 failed, 1 skipped. Failures are pre-existing and unrelated (Translation Studio seed hash, landing `Go Live` source string, media `20260869` existence).

Authenticated live E2E: BLOCKED (`cursor-ide-browser` MCP absent). Do not invent PASS.

## TypeScript

`npx tsc --noEmit` PASS

## Build

BLOCKED in this worktree after a failed `node_modules` junction cleanup (Turbopack then missing local `next`). `tsc` passed before the install break. Do not treat production cutover as verified.

## git diff --check

PASS (no whitespace errors)

## git status --short

See Exact files changed. `node_modules` local install debris is untracked and must not be committed.

## Open issues

- Remote apply of `20260930` required before live self-enroll PASSes.
- Authenticated JA-09 M01-L03 / progress / quiz smoke still needs an approved session path.
- Do not race Store `46c941f7` integrate/deploy.
- Live production remains `e6b23cc388ddb5e452a405d24d714a5f5bc67818` / rollback `e6b23cc3-20260818173442`.
