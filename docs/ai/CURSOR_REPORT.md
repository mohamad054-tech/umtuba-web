# CURSOR_REPORT

## Summary

**Article Auto-Teaser Video V1 implemented** on `office/article-auto-teaser-video-v1` (from `45f315e`). Real MP4 teasers via Node+FFmpeg worker; publish request only enqueues jobs. Silent audio only. Migration `20260867` Git-only (not applied remotely). **No commit / no push.**

## Architecture summary

1. Publish article (existing `publish_my_article`).
2. If uploaded teaser selected → `mark_my_article_teaser_uploaded` → job `not_required` + link `posts.article_id`.
3. If no video → `enqueue_my_article_teaser_job` → one `pending` job (unique per article). **No feed post yet.**
4. Worker (`scripts/media/articleTeaserWorker.ts`) claims via service-role RPC → FFmpeg 5s silent H.264 → upload `post-videos` → insert/update one ready video post with `article_id` → job `ready`.
5. Home feed unchanged; existing gates (`ready` + `video_path` + signed URL) surface the teaser; deeplink flow from prior commit still applies.

## Exact files created and modified

### Created
- `supabase/migrations/20260867_article_auto_teaser_video_v1.sql`
- `lib/articles/articleTeaserFoundation.ts`
- `lib/articles/articleTeaserFoundation.test.ts`
- `lib/articles/articleTeaserTitleLayout.ts`
- `lib/articles/articleTeaserFfmpeg.ts`
- `scripts/media/articleTeaserWorker.ts`
- `app/create/article/CreateArticleForm.tsx`
- `app/articles/[articleId]/ArticleTeaserOwnerPanel.tsx`

### Modified
- `app/actions/articles.ts`
- `app/create/article/page.tsx`
- `app/articles/[articleId]/page.tsx`
- `package.json` (`teaser:worker`, `teaser:worker:once`)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

**`20260867_article_auto_teaser_video_v1.sql`** (not applied remotely)

- Table `article_teaser_jobs` with status/source/background/audio/generated paths/post id/attempts/error
- Unique index on `article_id`
- Pending index; owner read RLS; mutations via SECURITY DEFINER RPCs
- RPCs: `enqueue_my_article_teaser_job`, `mark_my_article_teaser_uploaded`, `retry_my_article_teaser_job`, `claim_article_teaser_job` (service_role only)

## Worker execution model

```bash
npx tsx scripts/media/articleTeaserWorker.ts          # loop
npx tsx scripts/media/articleTeaserWorker.ts --once   # single claim
# or npm run teaser:worker / teaser:worker:once
```

Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `UMTUBA_TEASER_FONT`. Requires `ffmpeg` on PATH.

## FFmpeg rendering approach

`buildTeaserFfmpegArgs` → lavfi color (or looped background image) + soft crop motion + drawtext (title lines, @author, CTA) → `-t 5 -c:v libx264 -pix_fmt yuv420p -an` (no audio track). Fonts: Windows Arial/Segoe/Tahoma, Linux DejaVu/Noto Arabic, macOS Arial Unicode, or `UMTUBA_TEASER_FONT`.

## User flow

1. Create article → optional existing video OR auto-teaser settings (9:16 preview, gradients/plain/upload bg).
2. Publish → article always succeeds; job enqueued if generating.
3. Worker produces MP4 → Home shows teaser when `ready`.
4. Owner article page: status; on failure → Retry or attach ready uploaded video.

## Failure and retry

- Fail → job `failed` + safe `error_code`; article kept; no broken feed post.
- Retry RPC → `pending` (max attempts 8); reuses `generated_post_id` / video path when possible (no duplicate posts).
- Manual attach → `not_required` + link uploaded ready video.

## Tests and validation

- `npx vitest run lib/articles/articleTeaserFoundation.test.ts lib/articles/articlesFoundation.test.ts app/lib/nav/creatorProfileArticleDeeplink.test.ts` — **22/22 PASS**
- `npx tsc --noEmit` — **PASS**
- `npm run build` — **PASS**
- `git diff --check` — **PASS**
- No remote migration run

## Constraints / follow-ups

1. **Arabic fonts:** rely on system fonts; set `UMTUBA_TEASER_FONT` to a known Arabic-capable TTF in production workers.
2. **Audio:** silent only; user upload + platform library deferred.
3. **Article image background:** UI option disabled (no article cover column yet) → falls back to gradient.
4. **Migration must be applied** (local/remote GO) before worker can claim jobs.
5. Worker is not auto-scheduled (no cron in repo) — run manually or wire host cron later.

## Security review

- Claim RPC service_role only
- Owners SELECT jobs only; mutations via definer RPCs
- Publish path does not use service role / FFmpeg
- Error codes sanitized; no stack traces in UI
- Feed still requires ready + real `video_path`

## Open issues

1. Apply `20260867` when approved (not done).
2. Host FFmpeg worker process / cron.
3. Optional: Noto Arabic font packaging for Linux workers.
4. Await commit/push GO.

## git status / diff

See live shell output in final user report (`git diff --stat`, `git status -sb`).
