# Cursor Report — Signed-in visibility PostgREST fix V1

## Summary

Hotfix on `feat/legal-pages-v1` at `e3431744`. Signed-in Home/Discover failed because `applyViewerVisibility` put embed column names (`visibility_author.moderation_status`) inside a parent PostgREST `or=(...)` tree. Anonymous still used `.is` + `.eq` and worked.

Picked **option (a)**: embed `.or(..., { referencedTable: "visibility_author" })` plus a separate base-table `.or()`. Cleanest because it stays one `.from("posts")` builder, needs no migration/RPC, and keeps the boolean identical to `post_is_visible_to_viewer`. The owner check for shadowbanned authors uses `visibility_author.id` (same value as `posts.user_id` via `profiles!user_id!inner`). Mixing those in one parent `or()` is what PostgREST cannot parse.

Option (b) as two mixed-free filters without `referencedTable` cannot express `(active OR (shadowbanned AND owner))` in one request. Option (c) would work but needs a new view/RPC and a production apply.

Anonymous path is unchanged. One helper still owns the rule. Feed error logging now includes PostgREST `code` and `message` on the server only; the client still gets the generic string.

Not committed.

## Exact files changed

- `lib/supabase/postVisibility.ts` — signed-in filters rewritten; `or` accepts `{ referencedTable }`
- `lib/supabase/postVisibility.test.ts` — signed-in call shape, boolean equivalence, real supabase-js query-string syntax
- `lib/supabase/videoPostsServer.ts` — diagnosable feed error log
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Visibility boolean unchanged. Others' live shadowbanned posts stay hidden: embed `or` is `active OR (shadowbanned AND visibility_author.id = viewer)`, ANDed with `deleted_at IS NULL OR posts.user_id = viewer`.
- Viewer UUID is still validated before interpolation.
- Suspended/banned authors still fail the embed `or` (status is neither active nor shadowbanned).
- `/admin/moderation` still does not call the helper.
- Server log adds `error.code` and `error.message` only. Client response is still `"Unable to load videos. Please try again."`
- No secrets, env files, RLS edits, or remote DB access.

## Tests

```
npx vitest run lib/supabase/postVisibility.test.ts \
  lib/moderation/ugcPostVisibilityFoundation.test.ts
```

PASS — 18 tests (2 files). New coverage: signed-in supabase-js URL has `visibility_author.or=(moderation_status.eq.active,and(moderation_status.eq.shadowbanned,id.eq.<uuid>))` and parent `or=(deleted_at.is.null,user_id.eq.<uuid>)`. Each logic tree leaf is `column.op.value` with no embed name inside the parent `or`. Anonymous URL is still `deleted_at=is.null` and `visibility_author.moderation_status=eq.active`.

```
npx vitest run lib/supabase/followingFeed.test.ts \
  lib/search/globalSearchFoundation.test.ts \
  lib/store/videoCommerce.test.ts \
  app/watch/lib/mapWatchVideo.test.ts
```

PASS — 29 tests.

## TypeScript

```
npx tsc --noEmit
```

PASS.

## Build

```
npm run build
```

PASS. Next.js 16.2.11 Turbopack. Pre-existing `next.config.ts` NFT warning unchanged.

## git diff --check

PASS. No whitespace errors.

## git status --short

```
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M lib/supabase/postVisibility.test.ts
 M lib/supabase/postVisibility.ts
 M lib/supabase/videoPostsServer.ts
```

## Open issues

- Not committed. Not pushed. Not deployed.
- Live signed-in Home/Discover was not clicked in a browser here (needs a real session against a host running this tree). Query construction is covered by the supabase-js URL test.
- Other `console.error` feed loaders (following, Life, saved) still log the raw error object only. Out of scope.
