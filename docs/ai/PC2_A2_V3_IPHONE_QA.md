# PC2-A2 V3 — iPhone QA Build 3: post-publish Open Watch

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_A2_V3_IPHONE_QA_OPEN_WATCH
DATE = 2026-08-15
MODE = INVESTIGATE / SMALLEST_SAFE_FIX
COMMIT_CREATED = NO
PUSHED = NO
REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
EAS = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
MOBILE_SOT = origin/master 09e94f8
APP_STORE_SHA = 4eede0b
DIVERGED_CHECKOUT_USED_AS_SOT = NO
```

## Operator real-iPhone evidence (Build 3, iPhone 13)

Do not overwrite evidenced PASS values.

```text
INSTALL = PASS
APP_LAUNCH = PASS
WATCH_PLAYBACK = PASS
VIDEO = PASS
AUDIO = PASS
DISCOVER_LOAD = PASS
CREATE_UI = PASS
PHOTO_LIBRARY_PERMISSION = GRANTED
CREATE_UPLOAD = PASS
VIDEO_PUBLISHED_TO_PLATFORM = PASS
```

Create/upload details (operator):

- selected iPhone-recorded QuickTime video
- ~9.5 MB, ~8.2 sec
- Arabic caption
- accepted Terms
- app reported "Video published."
- operator independently confirms the uploaded video exists on the platform

Finding: after successful publish, tapping **Open Watch** opens the normal Watch feed and does **not** navigate to / surface the newly published video.

## Verdict

```text
OPEN_WATCH_BEHAVIOR = BARE_WATCH_TAB_NO_POST_ID
INTENDED_OR_DEFECT = DEFECT
```

This is a **navigation/UX defect**, not intended “always open the live public feed” behavior.

Watch already has a first-class focus contract (`?post=` → `focusPostId` → fetch/prepend that ready video). Create already receives `postId` from `publishVideoPost`. The success CTA discards that id and replaces to the bare Watch tab. If Watch was already mounted, that replace also does **not** change `focusPostId`, so the existing (possibly stale) feed stays on screen.

## Evidence (authoritative mobile source)

Compared `origin/master` `09e94f8` and App Store SHA `4eede0b` (build 3). Open Watch is identical on both. Local checkout `pc2/eas-preview-config-v1` `77e9e28` was **not** used as source of truth and was not merged/reset.

### 1. Create success CTA opens the bare tab

`app/(tabs)/create.tsx` (09e94f8 / 4eede0b):

```tsx
onPress={() => router.replace("/(tabs)/watch")}
```

Label is **Open Watch** immediately under **Video published.** No post id, no deep link.

### 2. Publish already returns the new post id — Create drops it

`src/lib/video/publishVideoPost.ts`:

```ts
| { ok: true; postId: number }
// ...
return { ok: true; postId: post.id };
```

Create then called `completePublish(s)` with no id. `CreateJourneyState` had no `publishedPostId` field.

### 3. Watch already focuses `?post=`

`app/(tabs)/watch.tsx`:

- `useLocalSearchParams<{ post?: string }>()`
- `focusPostId` parsed from `params.post`
- `fetchWatchFeedPage(supabase, { focusPostId, limit: 12 })`
- `loadInitial` depends on `focusPostId` — a new `?post=` refreshes; a bare `/(tabs)/watch` does not

`src/lib/feed/watchFeed.ts` already fetches a missing focused ready video by id and can prepend it (even when it is not in the first public page).

`src/lib/linking/deepLinks.ts` already maps `watch?post=N` → `/(tabs)/watch?post=N`.

`src/lib/discover/mapDestination.ts` `watchPostDestination(postId)` already builds the same Watch href for Discover.

So “open the published video” is an existing product contract. Create was the missing caller.

### 4. Why the operator saw the normal feed

Two stacked effects of the bare replace:

1. No `?post=` → Watch treats this as the live public feed, `activeIndex` 0.
2. If the Watch tab was already visited, `focusPostId` stays `null`, `loadInitial` does not re-run, and the previous feed remains. The new video is not guaranteed to appear first (or at all) on that stale list.

This matches the operator finding exactly. It is not “wait for the feed to catch up”: publish sets `media_status: "ready"` before returning success, and Watch can load that row by id when given `focusPostId`.

## Fix applied (source only; not committed)

Smallest safe fix on a **new worktree/branch from `origin/master`**, because the local mobile checkout is diverged at `77e9e28`.

```text
BRANCH = pc2/a2-open-watch-published-post-v1
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1
BASE = origin/master 09e94f80775855d7e2036fa7d83d63b9202fb8a4
COMMIT_CREATED = NO
GIT_IDENTITY = MISSING
```

Changes (uncommitted patch on that branch):

1. Store `publishedPostId` on the create journey when `publishVideoPost` succeeds.
2. **Open Watch** uses `openWatchAfterPublishHref(postId)` → `/(tabs)/watch?post=N` (fallback bare tab if id missing).
3. `promoteFocusedWatchRow` moves/prepends the focused ready post to index 0 so Watch’s `activeIndex` 0 actually surfaces it (including when it is already in the first page but not first).

Exact files changed (mobile worktree only):

- `app/(tabs)/create.tsx`
- `src/lib/video/createJourney.ts`
- `src/lib/video/createJourney.test.ts`
- `src/lib/feed/watchFeed.ts`
- `src/lib/feed/watchFeed.map.test.ts`

Not committed: `git config user.name` / `user.email` empty. Leave the patch on the branch.

## Tests / TypeScript

```text
vitest src/lib/video/createJourney.test.ts src/lib/feed/watchFeed.map.test.ts = 2 files / 19 tests PASS
npx tsc --noEmit = PASS
git diff --check = PASS
```

Focused coverage:

- `completePublish(state, 42)` stores `publishedPostId`
- `openWatchAfterPublishHref(42)` → `/(tabs)/watch?post=42`
- invalid / missing id falls back to `/(tabs)/watch`
- focused row is moved to front or prepended when fetched

## Remaining real-iPhone QA

Operator did not evidence these. Keep **NOT_TESTED**. Do not convert to PASS.

```text
SIGNUP = NOT_TESTED
LOGIN = NOT_TESTED
POST_LOGIN_DESTINATION = NOT_TESTED
SAVED = NOT_TESTED
FOLLOW_FOLLOWING = NOT_TESTED
MESSAGES = NOT_TESTED
ACCOUNT_DELETION = NOT_TESTED
UGC_REPORT_BLOCK = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
NETWORK_ERRORS = NOT_TESTED
CRASH_BEHAVIOR = NOT_TESTED
PROFILE_SETTINGS = NOT_TESTED
```

Install/launch already PASS — not overwritten.

## Build / ship

The Open Watch fix is JavaScript/TypeScript in the Expo app. Build 3 (`4eede0b`) still has the defect. A new binary is required to ship and re-verify on device. EAS was **not** run. Build 3 was **not** rebuilt or re-uploaded.

```text
NEW_MOBILE_BUILD_REQUIRED = YES
IOS_REBUILD_REQUIRED = YES
REBUILD_EXECUTED = NO
```

## Security review

- No secrets, env, or service-role use.
- Navigation only passes a numeric post id already returned by the owner publish path.
- Watch focus still requires `media_status = ready` and a video path (existing feed rules).
- No RLS / RPC / schema change.

## Final fields

```text
OPEN_WATCH_BEHAVIOR = BARE_WATCH_TAB_NO_POST_ID
INTENDED_OR_DEFECT = DEFECT
EVIDENCE = create.tsx replace("/(tabs)/watch") drops publishVideoPost.postId; Watch already focuses ?post= via focusPostId; identical on 09e94f8 and 4eede0b
FIX_APPLIED = YES_UNCOMMITTED
NEW_MOBILE_BUILD_REQUIRED = YES
IOS_REBUILD_REQUIRED = YES
CREATE_UPLOAD = PASS
VIDEO_PUBLISHED_TO_PLATFORM = PASS
INSTALL = PASS
APP_LAUNCH = PASS
WATCH_PLAYBACK = PASS
REMAINING_QA = SIGNUP=NOT_TESTED; LOGIN=NOT_TESTED; POST_LOGIN_DESTINATION=NOT_TESTED; SAVED=NOT_TESTED; FOLLOW_FOLLOWING=NOT_TESTED; MESSAGES=NOT_TESTED; ACCOUNT_DELETION=NOT_TESTED; UGC_REPORT_BLOCK=NOT_TESTED; BACKGROUND_RESUME=NOT_TESTED; NETWORK_ERRORS=NOT_TESTED; CRASH_BEHAVIOR=NOT_TESTED; PROFILE_SETTINGS=NOT_TESTED
BLOCKERS = NEW_MOBILE_BUILD_REQUIRED_TO_SHIP_AND_REVERIFY_OPEN_WATCH; GIT_IDENTITY_MISSING_PATCH_UNCOMMITTED; REMAINING_IPHONE_QA_NOT_TESTED
```
