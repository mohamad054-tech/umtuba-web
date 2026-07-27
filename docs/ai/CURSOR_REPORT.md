# CURSOR_REPORT

## Summary

**Unified Content Foundation V1 implemented** on `office/unified-content-foundation-v1` (from `f9807f2`). Thin registry + article/video adapters + Profile All + shared teaser template engine. Home unchanged. Migration `20260868` Git-only. **No commit / no push.**

## Architecture summary

Domains remain authoritative. `content_registry` is a thin index (`article` | `video`). Adapters sync via SECURITY DEFINER RPCs (no direct client writes). Article teasers stay discovery posts for articles; independent ready videos register as `video`. Profile All reads registry chronologically without duplicating article+teaser. Teaser rendering extracted to `lib/content/teaser/teaserTemplateEngine.ts`; article modules wrap it.

## Exact files created and modified

### Created
- `supabase/migrations/20260868_unified_content_foundation_v1.sql`
- `lib/content/contentRegistry.ts`
- `lib/content/contentFoundation.test.ts`
- `lib/content/adapters/articleAdapter.ts`
- `lib/content/adapters/videoAdapter.ts`
- `lib/content/teaser/teaserTemplateEngine.ts`
- `app/profile/components/ProfileAllPanel.tsx`
- `docs/architecture/UNIFIED_CONTENT_FOUNDATION_V1.md` (approved design)

### Modified
- `app/actions/articles.ts`
- `app/profile/ProfileExperience.tsx`
- `app/profile/[username]/page.tsx`
- `app/profile/types.ts`
- `app/profile/lib/mapProfile.ts`
- `app/profile/components/index.ts`
- `lib/articles/articleTeaserFfmpeg.ts`
- `lib/articles/articleTeaserTitleLayout.ts`
- `lib/articles/articleTeaserFoundation.ts`
- `lib/supabase/videoPosts.ts`
- `scripts/media/articleTeaserWorker.ts`
- `vitest.config.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations / RLS

`20260868_unified_content_foundation_v1.sql` — **not applied remotely**

- Table `content_registry` + unique `(content_kind, source_entity_id)`
- RLS force: public reads only `visibility=public AND publish_state=published`; owners read own
- No INSERT/UPDATE grants to authenticated
- RPCs: `upsert_content_registry_item`, `deactivate_content_registry_item`, `set_content_registry_discovery_post`, `backfill_content_registry_v1` (service_role only for backfill)

## Registry data model

`id, content_kind, source_entity_id, owner_user_id, visibility, publish_state, canonical_href, discovery_post_id, title, published_at, created_at, updated_at`

## Adapter contracts

`register/sync/resolveProfileCard/resolveCanonicalHref/resolveDiscoveryPost/resolveVisibility/unpublish`

## Profile All behavior

Tab `all` → `ProfileAllPanel` from registry; Articles/Videos tabs unchanged; deeplink prompt unchanged.

## Teaser Template Engine

Shared contract + layout + FFmpeg builder; article kind; 5s / 9:16 / silent; wrappers keep article worker working.

## Backfill strategy

`backfill_content_registry_v1()`: published articles (+ discovery post if ready) and independent ready videos (`article_id is null`). Idempotent upsert. Service_role only.

## Compatibility

Home/feed gate/articles/teasers/deeplink/worker paths preserved.

## Tests and validation

- vitest content + articles + deeplink — PASS
- `tsc --noEmit` — PASS
- `npm run build` — (see final shell)
- `git diff --check` — (see final shell)

## Risks / deferred

- Registry empty until migration applied + backfill/sync
- Learning/Store/Live/Games adapters deferred
- Soft-fail if registry table missing (profile All shows failed/empty)
- Title on registry is index-only (not full body)

## Open issues

Await commit/push GO. Do not merge to `alpha-0.2`. Do not apply remote migration.
