# Current Task

## Task title

Creator Profile + Article Deeplink V1 (gaps on `a2063fb`)

## Status

`complete` — implementation done locally; **not committed / not pushed** (awaiting human command)

## Branch / sync

- Branch: `office/creator-profile-article-deeplink-v1`
- Base: rebased local docs commit onto latest `origin/alpha-0.2`
- Backup: `backup/alpha-before-rich-profile-sync`
- Tracking sync at feature start: ahead of origin by rebased docs commit only (`1a05ea8`); behind 0

## Goal

Complete only the gaps after `a2063fb feat(platform): add video-first home and rich profiles`:

1. Avatar/name on article-linked video → profile with `?article=`
2. Prompt on profile: Read article now / Browse profile
3. Read → `/articles/{id}` (exact article)
4. Browse → clear query, stay at profile top
5. Normal profile visit → no prompt
6. Keep video-first home layout; light linked-article cue only
7. Professional profile header/tabs (no TikTok grid / FB clone)

## Allowed scope

- `app/lib/nav/routes.ts` (+ tests)
- `app/discover/**` (additive articleId / light cue only)
- `app/components/video/VideoOverlay.tsx`
- `app/watch/types.ts`, `app/watch/lib/mapWatchVideo.ts`
- `app/profile/**` (prompt + header polish)
- `docs/ai/*` handoff

## Forbidden scope

- Redesign home / player / engagement chrome
- New Feed stack / return to LandingHero
- Duplicate `articles` tables or RPCs
- Remote migration apply
- Commit / push / force push / hard reset
- Broad refactor

## Reuse (do not recreate)

- Migration `20260865_articles_teaser_foundation_v1.sql`
- `articles` + `posts.article_id` + `publish_my_article`
- `lib/articles/articlesFoundation.ts`
- Profile Articles tab + `/articles/[articleId]` + create article flow from `a2063fb`
