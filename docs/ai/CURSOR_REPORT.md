# CURSOR_REPORT

## Summary

Creator Profile + Article Deeplink V1 gaps completed on branch `office/creator-profile-article-deeplink-v1` after a safe rebase of the local handoff commit onto latest `origin/alpha-0.2`. Video-first home from `a2063fb` was preserved. **No commit / no push** (awaiting human command). **No new DB migration.**

## 1. Git sync result

| Step | Result |
| --- | --- |
| Pre-sync | Diverged: local `93a1144` ahead 1 / behind origin |
| Backup | `backup/alpha-before-rich-profile-sync` |
| Action | `git fetch` + `git rebase origin/alpha-0.2` |
| Conflicts | Docs only — kept remote Learning Catalog handoff; appended Watch Controls V2 notes from local commit |
| Rebased commit | `1a05ea8 docs(ai): save watch controls V2 handoff state` |
| Feature branch | `office/creator-profile-article-deeplink-v1` from synced tip |
| Post-sync | ahead 1 / behind **0** vs `origin/alpha-0.2` |

## 2. Already present in `a2063fb` (reused)

- Migration `20260865_articles_teaser_foundation_v1.sql` (`articles`, `posts.article_id`, `publish_my_article`)
- `lib/articles/articlesFoundation.ts` + create/read article routes
- Profile tabs All / Posts / Videos / Articles / About (+ Live)
- Feed hydration of `articleId` / `articleTitle` / `articleHref`
- Video-first home via `HomeFeedLoader` + `DiscoverExperience`
- Existing “Read article” control on teaser cards

## 3. Gaps implemented only

1. `buildCreatorProfileHref({ username, articleId? })` → `/profile/{user}?article={uuid}`
2. Discover / Watch avatar+name pass `articleId` into profile href
3. `ProfileLinkedArticlePrompt`: **Read article now** → `/articles/{id}`; **Browse profile** → `replace` without query (stay at top)
4. Prompt only when valid `?article=` UUID present; normal visits show none
5. Home/Watch: keep title; light “Linked article” cue; no full article body on feed
6. Profile header: cover gradient + overlapping avatar + bio/website/joined (no `cover_url` migration)

## Exact files changed

- `app/lib/nav/routes.ts`
- `app/lib/nav/pageAssembly.test.ts`
- `app/lib/nav/creatorProfileArticleDeeplink.test.ts` *(new)*
- `app/discover/DiscoverExperience.tsx`
- `app/discover/components/DiscoverCreatorInfo.tsx`
- `app/discover/components/DiscoverVideoCard.tsx`
- `app/discover/components/DiscoverCaption.tsx`
- `app/components/video/VideoOverlay.tsx`
- `app/watch/types.ts`
- `app/watch/lib/mapWatchVideo.ts`
- `app/profile/ProfileExperience.tsx`
- `app/profile/components/ProfileLinkedArticlePrompt.tsx` *(new)*
- `app/profile/components/ProfileHeader.tsx`
- `app/profile/components/index.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None. Reused `20260865` only. No remote apply.

## Security review

- Article id accepted only as UUID (`isUuid` / `UUID_RE`); invalid query → no prompt
- Read path uses existing published-article loader (`notFound` if unpublished/missing)
- No new RPC / service-role / secret exposure
- Profile browse clears `?article=` via client `router.replace` (no open redirect)

## Tests

- `npx vitest run app/lib/nav/creatorProfileArticleDeeplink.test.ts app/lib/nav/pageAssembly.test.ts` — PASS
- `npx vitest run lib/articles/articlesFoundation.test.ts` — PASS (3)

## TypeScript

- `npx tsc --noEmit` — PASS

## Build

- `npm run build` — PASS

## git diff --check

PASS (no whitespace errors)

## git status --short

See live status in final user report (feature branch dirty, uncommitted).

## Open issues

1. No DB `cover_url` yet — cover is CSS gradient only (intentional; no migration without proven gap).
2. Stash `stash@{0}: wip: docs before rich-profile rebase` may still exist — do not auto-drop; inspect before popping.
3. Prompt labels currently English (`Read article now` / `Browse profile`) — localize later if product requires AR copy.
4. **Awaiting human:** commit + push when approved.

## Final user flow

1. Teaser video on home shows light title + optional “Linked article” cue (+ existing Read article control) — not full body.
2. Tap avatar/name → `/profile/{username}?article={uuid}`.
3. Prompt: Read → `/articles/{uuid}`; Browse → clear query, stay at profile top.
4. Visit `/profile/{username}` without `?article=` → no prompt.
