# UMTUBA Global Search Foundation V1

Unified, production-oriented search across people, videos, stories, stores, and products. Designed to expand later to Live, hashtags, and places without breaking existing surfaces.

## Architecture

```
AppTopNav → /search (SearchExperience)
              ├─ globalSearchAction → runGlobalSearch (lib/search)
              ├─ recentSearchesAction / clearRecentSearchesAction
              └─ Tabs: All | People | Videos | Stories | Stores | Products
```

Domain code lives in `lib/search/` (types, validation, ranking, filters, queries, contracts, errors). Server entrypoints are `app/actions/search.ts`. UI lives under `app/search/`.

Search uses the normal cookie-bound Supabase client so **RLS remains the authority**. Application filters add defense-in-depth (ready videos, active stores, approved products, non-expired stories).

## Database

Migration: `supabase/migrations/20260804_global_search_foundation_v1.sql`

| Object | Purpose |
|---|---|
| `pg_trgm` | Trigram indexes for `ilike` performance |
| `search_entity_types` | Registry of active vs reserved entity types |
| `search_recent_queries` | Per-user recent search history |
| Trigram indexes | profiles, ready video posts, stories captions, stores, products |

V1 does **not** maintain a denormalized search documents table. Queries hit source tables under RLS. A future phase can add a materialized / outbox index while keeping the same action API.

## Ranking

Composite score (replaceable later):

```
score = match×0.55 + activity×0.25 + quality×0.20
```

- **Match:** exact → prefix → contains → token overlap
- **Activity:** exponential decay (~14-day half-life) from entity timestamps
- **Quality:** entity prior + signals (verified store, likes on videos, etc.)

Ranking is pure TypeScript (`lib/search/ranking.ts`) so it can be swapped for a learned ranker without changing the UI contract.

## Security

- `/search` is **public** (not in `PROTECTED_PREFIXES`)
- Stories results only when authenticated; RLS + app filter enforce owner/follower + `expires_at > now()`
- Videos: `post_type = video` and `media_status = ready`
- Products: active + approved + parent store active
- Stores: `status = active`
- Recent searches: owner-only RLS; anon has no grants
- Story `media_path` is never selected or returned
- Query sanitization strips `%`, `_`, and control punctuation; PostgREST patterns are quoted
- Minimum search length is 2 characters after sanitize
- Recent-search writes force `user_id = auth.uid()` via trigger + per-command RLS policies
- No `service_role` in actions or UI
- Video search never selects `video_path`; story search never selects `media_path`

## User flow

1. Tap **Search** in AppTopNav (all shells that use AppTopNav).
2. Type to see debounced suggestions; submit / change tab to commit URL (`?q=&tab=`).
3. **All** shows grouped sections with “See all”; other tabs show a flat ranked list.
4. Signed-in users get recent searches (clearable). Signed-out users still search public entities.
5. Result rows deep-link to existing product routes (profile, Discover post, store/product ids). Story hits link to the creator profile (no fake `/stories` route).

## Limitations

- No Live / hashtags / places results yet (reserved in registry)
- No typo-tolerant spellcheck / synonyms
- Stories matching is limited to visible active stories (caption + owner name), not a global public story index
- Store search page (`/store/search`) remains for commerce-scoped filters; global search complements it
- Ranking is heuristic, not personalized beyond visibility
- Trigram extension must be available on the target database (`extensions` schema)

## Next phases

1. Apply `20260804` remotely (targeted) after review
2. Live rooms + hashtags + places entities
3. Personalized ranking / engagement signals
4. Optional search documents table + incremental indexer
5. Keyboard command-palette entry
6. Mobile app parity

## Apply notes

Do not reset the database. Prefer targeted apply of `20260804_global_search_foundation_v1.sql` only. Confirm `pg_trgm` exists in `extensions` and that recent-search RLS has zero anon grants.
