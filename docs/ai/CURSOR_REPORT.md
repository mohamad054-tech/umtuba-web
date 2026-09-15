# Cursor Report — security batch 3

## Summary

SSR HTML now signs **at most the first/active** `post-videos` URL. Neighbors remint via existing `refreshWatchPlaybackAction` (visibility-checked, 15-minute TTL). Watch/Discover auto-advance and neighbor mount are unchanged. VideoObject JSON-LD still uses poster + canonical `/watch?post=` (no signed media URL).

`20260948_abuse_limits_v1.sql` is **written only** (not applied): view ≤1/(post,viewer)/24h; share ≤20/viewer/hour; watch-signal and referral helper-table throttles; `video_commerce_events` UPDATE/DELETE revoked; metadata ≤4 KB. App-level in-memory rate limits wrap the listed server actions.

Anon RPC identity remains `d:{uuid}` from the client (or auth uid). SQL cannot see a trusted anon fingerprint; rotating device keys bypasses SQL throttle. App limiter keys by user id or IP. Best follow-up: hash device id + IP on the server and pass that as the viewer key — never trust raw client values for counts.

## Exact files changed

See `git status --short` in this report. Primary: playback sign policy, Life/saved on-demand player, action rate limiter, `20260948`, i18n `report.error.rate`.

## Migrations created

- `supabase/migrations/20260948_abuse_limits_v1.sql` — **not applied**. Do not `supabase db push`.

## Security review

- Playback remint reuses `refreshWatchPlaybackUrlServer` + `applyViewerVisibility` / `isPostVisibleToViewer`.
- Rate limiter is per-process memory (single server v1); not a substitute for SQL throttle until 20260948 is applied.
- Anon view/share still accept `d:{uuid}`; IP limiter is the v1 abuse backstop.
- No secrets printed. No remote DB writes.

## Tests

- `npx tsc --noEmit` PASS
- Related vitest PASS (playback policy, security limiter, 20260948 foundation, i18n, Life contract, caption, VideoObject, feed unification, ugc report)
- `npm run build` PASS

## TypeScript

PASS (`npx tsc --noEmit` and Next build TypeScript step)

## Build

PASS (`npm run build`)

## git diff --check

Run at handoff.

## git status --short

Run at handoff.

## Open issues

- Local HTML signed-URL counts are **0** on `/`, `/watch?post=1`, `/life` because this worktree has no Supabase env (feeds empty/error). Production-before (live audit 2026-09-15): `/` = 13, `/life` = 98. After deploy, expect ≤1 SSR signed `post-videos` URL on those routes (Watch first page was already a 3-URL window; now 1).
- Profile grids still mint **thumbnail** signed URLs from `post-videos` (not playback). Playback `previewUrl` is no longer signed in SSR.
- `20260948` is not on production. Existing view window remains 6h until applied.
- DiscoverNativeVideo / DiscoverFeed still have pre-existing `react-hooks/set-state-in-effect` and img warnings.
