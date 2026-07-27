# Current Task

## Task title

Article Auto-Teaser Video V1

## Status

`complete` — implementation done locally; **not committed / not pushed** (awaiting human command)

## Branch / sync

- Branch: `office/article-auto-teaser-video-v1`
- Base: `45f315e` (`feat(platform): add creator profile article deeplink v1`)
- Do **not** merge to `alpha-0.2` yet
- Migration `20260867` is **Git-only** — not applied remotely

## Goal

Every article gets a home-feed teaser:
- Uploaded video → use it (`not_required`)
- No video → enqueue `pending` job → Node+FFmpeg worker renders silent 5s MP4 → upload `post-videos` → create/update ready post with `article_id`

## Allowed scope (this task)

- `supabase/migrations/20260867_article_auto_teaser_video_v1.sql`
- `lib/articles/articleTeaser*`
- `app/actions/articles.ts`, `app/create/article/*`, `app/articles/[articleId]/*`
- `scripts/media/articleTeaserWorker.ts`
- `package.json` scripts
- `docs/ai/*`

## Forbidden

- Remote migration apply
- Commit / push without GO
- Merge to `alpha-0.2`
- FFmpeg inside publish request
- Platform music library / unlicensed audio
- Co-authored-by / Signed-off-by / trailers
- Home feed redesign

## Audio V1 decision

Silent-only. User audio upload deferred (would expand storage/validation). No platform music library.
