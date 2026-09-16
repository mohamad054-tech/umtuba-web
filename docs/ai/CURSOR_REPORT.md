# Cursor Report — SEO batch 1 (soft 404, empty titles, demo noindex, hreflang)

## Summary

SEO batch 1 on `fix/seo-batch1-v1` from `origin/release/v1` @ `5ebab735`. Watch URLs for missing, deleted, non-public, inactive-author, or invalid post ids now return a real HTTP 404 from the server render (`notFound()`). Empty-caption Watch titles/descriptions/VideoObject names use a localized `"<display name> (@username) on UMTUBA"` pattern, with author city/country in the description when present; empty caption **and** no thumbnail is `noindex` and is excluded from the video sitemap. `/store/demo-preview/*` is self-canonical + `noindex, nofollow`. Demo/sample learning catalog slugs (`ja-01`, `ja-*`, `ai-foundations-for-builders`, visual demo courses) are `noindex, nofollow`, self-canonical, and excluded from all sitemaps. Local production HTML emits 13 locale + `x-default` alternate links on indexable pages (Next.js serializes the attribute as `hrefLang`). No SQL. Not deployed.

## Exact files changed

- `app/watch/page.tsx`
- `app/store/demo-preview/page.tsx`
- `app/store/demo-preview/[slug]/page.tsx`
- `app/learning/catalog/[courseSlug]/page.tsx`
- `lib/site/videoSeo.ts`
- `lib/site/videoSeo.test.ts`
- `lib/site/demoSeo.ts` (new)
- `lib/site/learningSeo.ts`
- `lib/site/publicSitemap.ts`
- `lib/site/googleSeo.test.ts`
- `lib/site/gscIndexingRepair.test.ts`
- `lib/supabase/publicVideoSeo.ts`
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

none

## Security review

- No SQL, no `supabase db push`, no deploy, no secrets/`.env` reads or writes.
- Watch 404 uses the existing public-video SEO loader (`applyViewerVisibility` + `isPostVisibleToViewer` as anonymous). Deleted posts, non-public posts, and inactive authors stay hidden and now 404 for the server render.
- Demo/sample store and learning catalog pages stay `noindex, nofollow` with a self-canonical (no home canonical).
- Empty-caption videos without a thumbnail are `noindex` and omitted from the video sitemap.
- `robots.txt` Disallow for `/world` and `/learning` was **not** changed. `/store/demo-preview` remains Disallow.
- Client Watch feed (`WatchExperience`) and in-app “post unavailable” UI were not rewritten.

## Tests

Related vitest (PASS):

- `lib/site/videoSeo.test.ts` (11)
- `lib/site/metadata.test.ts` (10)
- `lib/site/googleSeo.test.ts` (11)
- `lib/site/gscIndexingRepair.test.ts` (6)
- `lib/i18n/arabicLeakWatchAutoplayCloseout.test.ts` (4)

Coverage added/updated: invalid Watch query, empty-caption author titles (en/ar), location description, noindex without thumbnail, demo self-canonical, demo/sample course sitemap exclusion, Watch `notFound()` wiring.

## TypeScript

`npx tsc --noEmit` — PASS

## Build

`npm run build` — PASS (Next.js 16.2.11)

## git diff --check

PASS (no whitespace errors)

## git status --short

See commit on `fix/seo-batch1-v1` after this report is committed.

## ESLint (edited files)

`npx eslint` on the edited TS/TSX files listed above (plus `types.ts` / `en.ts` / `ar.ts`): **exit 0, no findings**.

No new vs pre-existing split: edited-file run was clean (0 errors, 0 warnings). Locale catalog string files follow the same pattern as `en.ts`/`ar.ts`.

## Local production HTML (after) — `next start` :3051

Stopped after measurement. Server logs: `Supabase URL is not configured.`

### Which checks ran without Supabase data

**Without Supabase:** `/`, `/life`, `/watch`, `/watch?post=*`, `/learning`, `/learning/catalog`, `/learning/catalog/ja-01`, `/learning/catalog/ai-foundations-for-builders`, `/sitemap.xml` dynamic extras, `/video-sitemap.xml` video list.

**No Supabase required:** unknown paths, `/privacy`, `/store/demo-preview`, invalid Watch ids (`abc`, `0`), static sitemap routes, robots.txt.

`/watch?post=99999999` 404 is the missing-post path; without Supabase the loader also returns null, which is the same `notFound()` branch as a missing/non-public row.

Could not measure a **real public Watch post** (empty-caption title / VideoObject on HTML) — no Supabase. Covered by unit tests.

### Before / after per SEO item

hreflang counts below use case-insensitive `hrefLang` / `hreflang`. Next.js 16 emits `hrefLang` (HTML-valid). A case-sensitive `hreflang=` grep reports 0 — that matches the 2026-09-15 live audit method.

| Item | Field | Before (live 2026-09-15 audit) | After (local prod build) |
|---|---|---|---|
| SEO-03 `/watch?post=99999999` | status | 200 | **404** |
| | title | Watch \| UMTUBA | UMTUBA - Ideas Without Borders (default 404) |
| | robots | noindex, nofollow | noindex |
| | canonical | `/watch?post=99999999` | `https://umtuba.com` (404 document) |
| | hreflang | 0 | 0 (404 page) |
| SEO-03 `/watch?post=abc` and `post=0` | status | (not sampled; invalid ids were 200 hub) | **404** |
| | title | Watch hub | default 404 |
| | robots | index, follow (hub) | noindex |
| | canonical | `/watch` | `https://umtuba.com` |
| | hreflang | — | 0 |
| SEO-02 / SEO-06 empty caption | title / VideoObject | “Video by {name}” / Untitled | Unit tests: `Ada (@ada) on UMTUBA`; ar: `آدا (@ada) على UMTUBA`; location description when city/country set; noindex if no thumbnail. **HTML of a real public post: no Supabase** |
| SEO-04 `/store/demo-preview` | status | 200 | 200 |
| | title | Demo catalog preview \| UMTUBA \| UMTUBA | **Demo catalog preview \| UMTUBA** |
| | robots | noindex, nofollow | noindex, nofollow |
| | canonical | `https://umtuba.com` (home) | **`https://umtuba.com/store/demo-preview`** |
| | hreflang | 0 | 0 (noindex; intended) |
| SEO-07 `/learning/catalog/ja-01` | status | 200 | 200 |
| | title | JA-01 — AI Foundations for Builders \| UMTUBA | Course \| UMTUBA (no live course payload; **no Supabase**) |
| | robots | index, follow | **noindex, nofollow** |
| | canonical | self | self |
| | hreflang | 0 | 0 (noindex) |
| SEO-07 sitemap | ja-01 / demo-preview | catalog slugs present on live | **absent** from local `/sitemap.xml` and `/video-sitemap.xml` |
| SEO-01 `/` | status | 200 | 200 |
| | title | (brand) | UMTUBA - Ideas Without Borders |
| | robots | index, follow | index, follow |
| | canonical | home | `https://umtuba.com` |
| | hreflang | 0 (live grep) | **14** (x-default + 13 locales) |
| SEO-01 `/life` | status | 200 | 200 |
| | title | — | UM Life - UMTUBA |
| | robots | index, follow | index, follow |
| | canonical | `/life` | `https://umtuba.com/life` |
| | hreflang | 0 | **14** |
| SEO-01 `/privacy` | status | 200 | 200 |
| | title | Privacy Policy | Privacy Policy \| UMTUBA |
| | robots | index, follow | index, follow |
| | canonical | `/privacy` | `https://umtuba.com/privacy` |
| | hreflang | 0 | **14** |
| SEO-01 `/watch` (hub) | status | 200 | 200 |
| | title | Watch | Watch - UMTUBA |
| | robots | index, follow | index, follow |
| | canonical | `/watch` | `https://umtuba.com/watch` |
| | hreflang | 0 | **14** |
| SEO-01 `/learning` | status | 200 | 200 |
| | title | — | My Learning \| UMTUBA |
| | robots | noindex (intended) | noindex, nofollow |
| | canonical | `/learning` | `https://umtuba.com/learning` |
| | hreflang | 0 | 0 (noindex; intended) |
| SEO-01 `/learning/catalog` | status | 200 | 200 |
| | title | — | Learning Catalog - UMTUBA |
| | robots | index, follow | index, follow |
| | canonical | catalog | `https://umtuba.com/learning/catalog` |
| | hreflang | 0 | **14** |
| Unknown `/this-route-does-not-exist-seo-batch1` | status | 404 (audit) | **404** |
| | title | — | 404: This page could not be found. |
| | robots | — | noindex |
| | canonical | — | `https://umtuba.com` |
| | hreflang | — | 0 |
| Unknown `/random-unknown-xyz-404` | status | — | **404** / noindex / 0 hreflang |

SEO-01 conclusion: this SHA already emits 13 + x-default via `alternates.languages`. Local production HTML contains 14 `<link rel="alternate" hrefLang="…">` tags on indexable routes. Live audit 0 is consistent with **deploy drift** (older live SHA) and/or a **case-sensitive `hreflang=` grep** (Next 16.2.11 writes `hrefLang`). No extra emitter was added; Metadata API output is present.

## Open issues

- No real public Watch HTML for empty-caption / VideoObject / thumbnail noindex (needs Supabase + a public post).
- Default Next 404 document canonicalizes to home (real 404 status still set).
- `/learning/catalog/ja-01` title is generic “Course” without live course data; robots/canonical are correct.
- In-app Home “Untitled video” UI label was not changed (SEO titles/meta/VideoObject only).
- Live hreflang still needs a deploy of this SHA (or newer) to appear on umtuba.com.

```
TASK_ID = FIX_SEO_BATCH1_V1
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = fix/seo-batch1-v1
WORKTREE = D:\umtuba-central\repos\umtuba-web-seo-batch1-v1
BASE = 5ebab735406707f28878c118770579a361042e52
SQL = NONE
DEPLOY = NO
SUPABASE_DB_PUSH = FORBIDDEN
```
