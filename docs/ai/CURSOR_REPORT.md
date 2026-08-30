# CURSOR_REPORT

## Summary

PART 1B-A owner review gate completed without starting PART 1B-B. The existing social Home candidate was preserved and committed on a dedicated local branch. The already-running Next.js server was reused. Home `/` serves the new UI (Share on UM + video-first stage).

Authenticated functional steps (publish text/image, like, comment, mention, save, share, send-in-messages, profile return) could not be executed in a real signed-in session: cursor-ide-browser MCP created tabs that vanished immediately (same failure as the prior PART 1B-A report), Playwright Chromium is not installed in this environment, and signed-out curl shows `/saved`, `/messages`, and `/notifications` redirect to login. No fake users were created. No `.env` was read. The local preview was left running for the owner.

Feed position remains **PARTIAL**. Overlay close (comments / share / save / send-in-messages) stays in-page so the video feed does not remount. Profile and Home-tab navigation remount `/` without a stored index or playback time. A sessionStorage restore was considered and **not** applied: it would not close paginated/off-first-page or playback-time cases, and it could not be retested in a real browser this gate.

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_SOCIAL_EXPERIENCE_V1_PART1B_A_OWNER_REVIEW_GATE
STATUS = OWNER_REVIEW_UI_READY
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
IMPLEMENTATION_SHA = 4d4953d8314d8cbcb5b2e173786198fe7586d13e
BRANCH = pc2/um-life-part1b-a-social-home-candidate
LOCAL_PREVIEW_URL = http://localhost:3000/
IMPLEMENTED = YES
DEPLOYED = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
PART1B_B_STARTED = NO
```

## Exact files changed

Implementation commit `4d4953d8` `feat(um-life): part 1b-a social home candidate` (28 files):

New:

- `app/components/home/HomeLatestPostLayer.tsx`
- `app/components/home/HomeSocialComposer.test.ts`
- `app/components/home/HomeSocialComposer.tsx`
- `app/components/social/MentionedText.tsx`
- `app/components/social/ShareToMessagesPanel.tsx`
- `app/discover/components/DiscoverShellActions.tsx`
- `app/lib/social/homeSocialPost.ts`
- `app/lib/social/mentions.test.ts`
- `app/lib/social/mentions.ts`

Modified:

- `app/actions/search.ts`
- `app/components/CreatePostModal.tsx`
- `app/components/social/CommentsPanel.test.ts`
- `app/components/social/CommentsPanel.tsx`
- `app/components/social/ShareMenu.tsx`
- `app/discover/components/DiscoverActionRail.tsx`
- `app/discover/components/DiscoverCaption.tsx`
- `app/discover/components/DiscoverShell.tsx`
- `app/discover/components/DiscoverVideoCard.tsx`
- `app/discover/types.ts`
- `app/lib/social/socialEngagement.harden.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `lib/i18n/appShellTranslation.test.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/types.ts`
- `lib/supabase/videoPosts.ts`

After that commit, this gate updated only:

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

Left unstaged (unrelated to PART 1B-A):

- `.env.example` (Android App Links comments)
- `vitest.config.ts` (android/sandbox test globs)
- Prior-task logs, sandbox, PC2 docs, worktrees, `app.json`, `app/.well-known/assetlinks.json/`

## Migrations created

None.

## Security review

- No secrets, `.env`, or service-role usage added or printed.
- No Auth/RLS bypass. No fake users. No password reset.
- Mention typeahead still uses public people search with `remember: false`.
- Send-in-Messages still reuses existing messenger actions and the share ledger.
- Composer/comments/share writes still require a real session.
- Known gap unchanged: no social block/report before composer scale (Part 2).

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

Not re-run this gate. No TypeScript implementation changes after `4d4953d8`. Prior PART 1B-A `npx tsc --noEmit` was exit 0.

## Build

Not run. Dev server already serving Home (`GET / 200`).

## git diff --check

Exit 0.

## git status --short

Candidate files are committed. Worktree is **not** clean because of unrelated dirty/untracked files from other tasks (see left-unstaged list). PART 1B-A implementation is not among them after `4d4953d8`.

## Open issues

1. **Owner must finish authenticated review** at http://localhost:3000/ while signed in. This agent could not keep a browser MCP tab and had no existing session.
2. **FEED_POSITION = PARTIAL** (details below). Not fixed this gate: a small sessionStorage restore would not close pagination or playback-time, and could not be retested live.
3. **StoryRail** still has pre-existing English copy (`Your story`, empty-state sentence). Not PART 1B-A scope.
4. **DiscoverExperience** aside/empty/error strings remain English (pre-existing). Touched social chrome is translated.
5. **Latest-post card** lives in the sticky Home header under the composer. A tall image post can compress the video stage on mobile. Dismiss exists.
6. **Watch** share rail still has no Send in Messages (Watch out of scope).
7. **No block/report** before composer scale (Part 2).
8. Nested replies / comment edit / reactions / albums / audience still require schema — not started.

---

## Owner visual review targets

A. **Share on UM premium/native?** Composer strip uses black/gold amber border, UM mark, and UMTUBA language (“Share on UM” / “شارك في أُم”). Not Facebook chrome. Owner should judge taste live.

B. **Composer familiar without Facebook clone?** Prompt field + Write + Photo, modal title “New UM post”. Familiar posting pattern, original copy.

C. **Video-first Home preserved?** Yes in HTML and architecture: `video-watch-stage` remains the body; `/discover` 307 → `/`; no second Home feed; `/feed` not revived.

D. **Your latest post natural vs obstructing video?** Card sits under the composer in the sticky header, not over the video stage. Dismissible. Image posts use `max-h-56`. Risk: sticky header growth on mobile can shrink the stage.

E. **Like/Comment/Share/Save immediately understandable?** Rail + latest-post chips use those labels (EN/AR). Present in signed-out Home HTML.

F. **Send in Messages feels UMTUBA not Messenger?** `ShareToMessagesPanel` is a black/gold bottom sheet (`#0b0b18`, amber tracking). Not Messenger blue. Not exercised with a real inbox this gate.

G. **Arabic RTL, no stray English, UGC dir=auto** Signed-out `umtuba_locale=ar` Home: `lang="ar"` `dir="rtl"`, Arabic composer prompt/photo/like, no English “Share on UM”. `dir="auto"` is on captions and share/comment UGC fields. Pre-existing StoryRail/aside English remains.

H. **Mobile collision** Not screenshot-verified (Playwright browsers missing; MCP tab failed). Code: sticky top (nav + composer + optional latest post) + StoryRail + video stage + bottom nav. Latest-post image is the main collision risk.

---

## Feed position

**FEED_POSITION = PARTIAL**

What already stays in place (implementation, not live-authenticated):

- Home → comments → close: `CommentsPanel` is an overlay; `DiscoverFeed` stays mounted.
- Home → save / share menu: in-page; feed stays.
- Home → Send in Messages → close: portal overlay; send success calls `onClose()` and does **not** route into `/messages`.

What remains partial:

- Home → author profile → back / Home tab: profile is a real `Link` to `/profile/[username]`. Return to `/` remounts `DiscoverExperience` at `initialIndex` 0 unless `?post=` is in the URL **and** that video is still in the currently loaded list.
- `/?post=` restore does not include playback time (Watch has `restoreState`; Home `DiscoverFeed` does not).
- Videos reached only after load-more are not in `initialVideos`, so `findIndexByPostId` misses them (`showDeepLinkMiss`).
- Latest-post “view profile” uses `buildHomeSocialProfileHref` (no return `?post=` for the **video** under the overlay).
- Soft back *may* keep client state if the App Router cache keeps Home mounted; that was not observed this gate.

No schema or architecture change was made. A first-page-only sessionStorage restore was judged insufficient to close the issue.

---

## Regression check

Live HTTP against the reused dev server:

- `/` 200 — Share on UM + `video-watch-stage`
- `/discover` 307 → `/`
- `/watch` 200
- `/saved` 307 → `/login?next=%2Fsaved` (signed out)
- `/messages` 307 → `/login?next=%2Fmessages` (signed out)
- `/notifications` 307 → `/login?next=%2Fnotifications` (signed out)
- `/profile/umtuba` 200

LTR Home: `lang="en"` `dir="ltr"`. RTL Home cookie: `lang="ar"` `dir="rtl"`. No duplicate Home feed in the candidate. Latest-post card only mounts after a client `umtuba:home-social-posted` event (not duplicated in SSR HTML). Dev logs previously showed `recordViewAction` on Home videos after the SearchTab fix.

---

# STRUCTURED PART 1B-A OWNER REVIEW GATE OUTPUT

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_SOCIAL_EXPERIENCE_V1_PART1B_A_OWNER_REVIEW_GATE
STATUS = OWNER_REVIEW_UI_READY
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
CANDIDATE_SHA = 4d4953d8314d8cbcb5b2e173786198fe7586d13e
BRANCH = pc2/um-life-part1b-a-social-home-candidate
WORKTREE_CLEAN = NO
LOCAL_PREVIEW_URL = http://localhost:3000/
HOME_VIDEO_FIRST = PASS
OWNER_REVIEW_UI_READY = YES
TEXT_POST_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
IMAGE_POST_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
LIKE_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
COMMENT_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
DELETE_COMMENT_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
MENTION_TYPEAHEAD_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
SAVE_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
SHARE_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
SEND_IN_MESSAGES_REAL_UI = NOT_TESTED_REAL_DATA_UNAVAILABLE
PROFILE_RETURN = NOT_TESTED_REAL_DATA_UNAVAILABLE
FEED_POSITION = PARTIAL
FEED_POSITION_DETAILS = Overlays (comments/share/save/send-in-messages) keep DiscoverFeed mounted. Profile or Home-tab remount resets to first video unless ?post= matches a still-loaded item. Playback time is not restored. Paginated videos cannot be restored from the first page alone. No architecture change this gate.
VIDEO_PLAYBACK = PASS
STORIES = PASS
RTL = PASS
LTR = PASS
MOBILE_WEB = NOT_TESTED_REAL_DATA_UNAVAILABLE
DESKTOP_WEB = PASS
REGRESSIONS_FOUND = None observed on signed-out route/HTML checks. Authenticated social actions not executed. Browser MCP could not keep a tab. Playwright Chromium not installed.
FILES_CHANGED_AFTER_INITIAL_PART1B_A = docs/ai/CURRENT_TASK.md; docs/ai/CURSOR_REPORT.md
TESTS_RUN = npx vitest run (10 files / 62 tests, pass); git diff --check (exit 0)
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
DEPLOYED = NO
PART1B_B_STARTED = NO
READY_FOR_OWNER_VISUAL_REVIEW = YES
READY_FOR_PART1B_B_AUTHORIZATION = NO
```
