# Current Task

## Task title

FIX_SEO_BATCH1_V1

## Status

Implement SEO batch 1 from the 2026-09-15 site audit: real Watch 404s, empty-caption titles, demo noindex + self-canonical, sitemap exclusions, hreflang verification. No SQL. Not deployed.

```
TASK_ID = FIX_SEO_BATCH1_V1
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = fix/seo-batch1-v1
WORKTREE = D:\umtuba-central\repos\umtuba-web-seo-batch1-v1
BASE = origin/release/v1 @ 5ebab735406707f28878c118770579a361042e52
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

Audit source: `docs/audit/SITE_AUDIT_2026-09-15.md` SEO-01 / SEO-02 / SEO-03 / SEO-04 / SEO-06 / SEO-07 (file lives on docs/site-audit branch; findings copied into this task).

### Findings to fix

- **SEO-03:** `/watch?post=99999999` returns HTTP 200 (soft 404, noindex). Missing / deleted / non-public / inactive-author / invalid id must be a real 404 for the server render.
- **SEO-02 / SEO-06:** Empty captions render as "Untitled video" / "Video by ..." titles and generic VideoObject names. Use `"<display name> (@username) on UMTUBA"` style + author/location description. If caption empty AND no thumbnail: noindex + exclude from video sitemap.
- **SEO-04:** `/store/demo-preview` is noindex but canonical points to home. Self-canonical + noindex, nofollow.
- **SEO-07:** Demo catalog courses (e.g. ja-01) are indexable. Demo/sample store and learning catalog pages: noindex, nofollow; self-canonical; excluded from all sitemaps.
- **SEO-01:** Audit saw 0 hreflang tags on live HTML while code emits `?hl=` alternates. Verify on local production build; fix if missing.
- Unknown routes must return 404 (not 200).
- Do not change `robots.txt` rules for `/world` or `/learning` unless a demo page is wrongly indexable.

### Allowed scope

- Watch server metadata / notFound for missing or non-public posts (do not break client-side feed navigation or in-app 'post unavailable').
- Watch / VideoObject / sitemap title and robots helpers for empty captions.
- Demo/sample store and learning catalog metadata, canonical, sitemap exclusion.
- hreflang emission if local build is missing tags the code intends.
- Existing metadata / jsonLd / videoSeo / hreflang helpers.
- New i18n keys via existing catalogs (prefer all 13 locales).
- Related tests and handoff docs (`CURRENT_TASK.md`, `CURSOR_REPORT.md`).

### Forbidden scope

- Do not apply SQL or run `supabase db push`.
- Do not deploy.
- Do not force-push, rebase, hard-reset.
- Do not expose secrets / `.env`.
- Do not change `robots.txt` rules for `/world` or `/learning` (noindex is intended) unless a demo page is wrongly indexable.
- Do not commit onto `release/v1`.
- Do not reuse dirty sibling worktrees.
