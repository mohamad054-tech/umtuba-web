# CURSOR_REPORT

## Summary

Implemented PART 1B-A of UM Life social experience on existing Home architecture. Video-first Home `/` is preserved. The existing `CreatePostModal` / `createPost` / `post-images` composer is now mounted on production Home via `DiscoverShell` with original UMTUBA language (“Share on UM”), not Facebook chrome.

**Text/image presentation choice:** Home remains video-only (`getDiscoverVideosServer`). After publish, a compact **Your latest post** overlay (`HomeLatestPostLayer`) shows the current user’s just-published text/image post with like / comment / save / share, plus a profile deep link (`?tab=all` or `?tab=photos`). This is not a second Home feed and does not revive `/feed`.

Like stays binary (`toggle_post_like`) with optimistic + realtime counts. Comments keep the existing flat model; mention typeahead uses `globalSearchAction` (`tab=people`, `remember=false`); `@username` in comment/post text is clickable to `/profile/[username]`. Share menu adds **Send in Messages** via existing messenger actions. Save remains on the action rail and Home chrome.

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_SOCIAL_EXPERIENCE_V1_PART1B_A
STATUS = IMPLEMENTATION_COMPLETE_UNCOMMITTED
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
FINAL_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
BRANCH = office/platform-translation-trunk-port-v1
IMPLEMENTED = YES
DEPLOYED = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
```

## Exact files changed

New:

- `app/components/home/HomeSocialComposer.tsx`
- `app/components/home/HomeLatestPostLayer.tsx`
- `app/components/home/HomeSocialComposer.test.ts`
- `app/components/social/MentionedText.tsx`
- `app/components/social/ShareToMessagesPanel.tsx`
- `app/discover/components/DiscoverShellActions.tsx`
- `app/lib/social/mentions.ts`
- `app/lib/social/mentions.test.ts`
- `app/lib/social/homeSocialPost.ts`

Modified:

- `app/discover/components/DiscoverShell.tsx` — mount composer + localized shell actions
- `app/components/CreatePostModal.tsx` — i18n, dirty discard, Home event + post payload, `dir="auto"`
- `app/components/social/CommentsPanel.tsx` — mentions, typeahead, profile taps, mobile sheet, i18n
- `app/components/social/ShareMenu.tsx` — Send in Messages + i18n
- `app/discover/components/DiscoverActionRail.tsx` — share-to-messages, i18n labels
- `app/discover/components/DiscoverCaption.tsx` — `dir="auto"`, timestamp deep link
- `app/discover/components/DiscoverVideoCard.tsx` — pass post id / createdAt
- `app/discover/types.ts` — optional `createdAt`
- `lib/supabase/videoPosts.ts` — map `created_at`
- `app/actions/search.ts` — remove `export type { SearchTab }` from `"use server"` (runtime crash when Home imported search)
- `lib/i18n/messages/types.ts`, `en.ts`, `ar.ts` — social keys (fr/es/de/pt inherit via `...enMessages`)
- `lib/i18n/i18nFoundation.test.ts`, `lib/i18n/appShellTranslation.test.ts`
- `app/components/social/CommentsPanel.test.ts`
- `app/lib/social/socialEngagement.harden.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- No secrets, `.env`, or service-role usage added.
- Composer and comments still require authenticated session for write; login `?next=` now returns to Home `/`.
- Mention typeahead uses existing public people search with `remember: false` (does not pollute recent searches).
- Send-in-Messages reuses existing messenger RPCs (`listConversations`, `getOrCreateDirectConversation`, `sendTextMessage`) and records share via existing ledger.
- Removed type re-export from a `"use server"` module that crashed Home when search was imported.
- Still no social block/report (Part 2 risk from the audit). Opening composer at scale without safety primitives remains a known gap.

## Tests

`npx vitest run` targeted (62 tests, all passed):

- `app/lib/social/mentions.test.ts`
- `app/components/social/CommentsPanel.test.ts`
- `app/components/home/HomeSocialComposer.test.ts`
- `app/lib/social/commentDraft.test.ts`
- `app/lib/social/socialEngagement.harden.test.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `lib/i18n/appShellTranslation.test.ts`
- `app/lib/nav/homeReadinessGuardrails.test.ts`
- `app/lib/nav/pageAssembly.test.ts`
- `app/lib/video/feedUnification.test.ts`

## TypeScript

`npx tsc --noEmit` — exit 0.

## Build

Not run. UI entry chrome changed (`DiscoverShell`), but `tsc` + targeted tests + live Home HTML verification were used instead of a full `npm run build` (long). Dev server served Home successfully after the SearchTab fix.

## git diff --check

Exit 0.

## git status --short

This task (uncommitted):

```text
 M app/actions/search.ts
 M app/components/CreatePostModal.tsx
 M app/components/social/CommentsPanel.test.ts
 M app/components/social/CommentsPanel.tsx
 M app/components/social/ShareMenu.tsx
 M app/discover/components/DiscoverActionRail.tsx
 M app/discover/components/DiscoverCaption.tsx
 M app/discover/components/DiscoverShell.tsx
 M app/discover/components/DiscoverVideoCard.tsx
 M app/discover/types.ts
 M app/lib/social/socialEngagement.harden.test.ts
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M lib/i18n/appShellTranslation.test.ts
 M lib/i18n/i18nFoundation.test.ts
 M lib/i18n/messages/ar.ts
 M lib/i18n/messages/en.ts
 M lib/i18n/messages/types.ts
 M lib/supabase/videoPosts.ts
?? app/components/home/HomeLatestPostLayer.tsx
?? app/components/home/HomeSocialComposer.test.ts
?? app/components/home/HomeSocialComposer.tsx
?? app/components/social/MentionedText.tsx
?? app/components/social/ShareToMessagesPanel.tsx
?? app/discover/components/DiscoverShellActions.tsx
?? app/lib/social/homeSocialPost.ts
?? app/lib/social/mentions.test.ts
?? app/lib/social/mentions.ts
```

Workspace already had a large unrelated dirty tree (docs, sandbox, worktrees). Those were not part of this task.

## Open issues

1. **Owner login required** to verify live text/image publish, discard-if-dirty, mention typeahead against real people, and Send in Messages. Signed-out Home was verified: composer strip, video stage, like/comment/save/share rails, timestamp `/?post=`, profile links.
2. **Browser MCP** could not keep a tab (navigate/lock failed). Verification used `curl` + Next.js HTML for `/` (200), `/discover` (307 → `/`), and `umtuba_locale=ar` (`lang="ar"` `dir="rtl"` + Arabic composer/rail).
3. **Mobile native-share shortcut** now opens the share menu first so Send in Messages is reachable. Native share remains a menu item.
4. **Watch** share rail was not given Send in Messages (Watch architecture out of scope except Home).
5. **No block/report** before composer scale (Part 2).
6. Nested replies / comment edit / post reactions / albums / audience still require schema — not implemented, as specified.

---

# STRUCTURED PART 1B-A OUTPUT
